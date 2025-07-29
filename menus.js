import readline from 'readline';
import { MongoClient } from "mongodb";
import fs from "fs";
import path from "path";


import { readAndInsertCsv, readAndInsertAllCsvInDirectory, updateDocument, deleteDocument, reporte1, reporte2 ,reporte3,reporte4} from './funciones.js';

const url = 'mongodb://localhost:27017';
const dbName = 'nominaAcme';
const collectionNames = {
    area: 'areas',
    cargo: 'cargos',
    ciudad: 'ciudades',
    concepto: 'conceptos',
    contrato: 'contratos',
    departamento: 'departamentos',
    empleado: 'empleados',
    nomina: 'nominas',
    sacarNomina: 'sacarNominas',
    tipo_contrato: 'tipos_contratos',
    tipo_id: 'tipos_identificaciones',
    tipo_novedad: 'tipos_novedades'
};

const client = new MongoClient(url);
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

async function connectDb() {
    if (!client.topology || !client.topology.isConnected()) {
        console.log('Conectando a MongoDB...');
        await client.connect();
        console.log('Conectado a MongoDB');
    } else {
        console.log('Ya conectado a MongoDB');
    }
    return client.db(dbName);
}

function input(pregunta) {
    return new Promise(resolve => rl.question(pregunta, resolve));
}

async function showMenu() {
    console.log('\n--- Menú Principal ---');
    console.log('1. Guardar data en base de datos desde UN CSV (Seleccionar por colección)');
    console.log('2. Guardar TODA la data en base de datos desde el directorio "raw-data" (Todos los CSVs)'); 
    console.log('3. Listar ítems');
    console.log('4. Actualizar ítem');
    console.log('5. Eliminar ítem');
    console.log('6. Reporte 1: Empleados con Contrato Vigente');
    console.log('7. Reporte 2: Detalle de Nómina por Empleado');
    console.log('8. Reporte 3: Empleados con Auxilio de Transporte');
    console.log('9. Reporte 4: Resumen de Nómina por Código');
    console.log('10. Salir');

    const opt = await input('Selecciona una opción: ');

    switch (opt) {
        case '1':
            await askdb(); 
            break;
        case '2': 
            await importAllCsvsFromDirectory();
            break;
        case '3': 
            await listItems(await connectDb());
            break;
        case '4':
            await updateItem(await connectDb());
            break;
        case '5':
            await deleteItem(await connectDb());
            break;
        case '6':
            await reporte1(await connectDb());
            break;
        case '7':
            const dbInstance2 = await connectDb(); 
            const empleadoId = await input('Ingresa el ID del empleado: ');
            const nominaId = await input('Ingresa el ID de la nómina: ');
            await reporte2(dbInstance2, empleadoId, nominaId);
            break;
        case '8':
            await reporte3(await connectDb());
            break;
        case '9':
            const dbInstance9 = await connectDb(); 
            const codigoNomina = await input('Ingresa el Código de la Nómina: ');
            await reporte4(dbInstance9, codigoNomina);
            break;
        case '10': 
            console.log('Saliendo...');
            rl.close();
            if (client.topology && client.topology.isConnected()) { 
                await client.close();
                console.log('Conexión a MongoDB cerrada.');
            }
            return;
        default:
            console.log('Opción Inválida.');
    }
    showMenu();
}

async function importAllCsvsFromDirectory() {
    console.log('\n--- Importar TODOS los CSVs del directorio "raw-data" ---');
    const dbInstance = await connectDb();
    const directoryPath = path.join(process.cwd(), 'raw-data');

    try {
        console.log(`Iniciando importación de todos los CSVs desde: ${directoryPath}`);
        
        for (const key in collectionNames) {
            if (Object.hasOwnProperty.call(collectionNames, key)) {
                const collectionName = collectionNames[key];
                const csvFilePath = path.join(directoryPath, `${collectionName}.csv`);

              
                if (fs.existsSync(csvFilePath)) {
                    console.log(`Procesando archivo: ${collectionName}.csv en la colección: ${collectionName}`);
                    await readAndInsertCsv(csvFilePath, dbInstance, collectionName);
                } else {
                    console.log(`[INFO] Archivo ${collectionName}.csv no encontrado en ${directoryPath}. Saltando.`);
                }
            }
        }
        console.log('Proceso de importación masiva de CSVs completado.');
    } catch (error) {
        console.error('Error durante la importación masiva de CSVs:', error.message);
    }
}



async function askdb() {
    console.log('\n--- Seleccionar Colección para Importar UN CSV ---');
    console.log('1. Área');
    console.log('2. Cargo');
    console.log('3. Ciudad');
    console.log('4. Concepto');
    console.log('5. Contrato');
    console.log('6. Departamento');
    console.log('7. Empleado');
    console.log('8. Nómina');
    console.log('9. Sacar Nómina');
    console.log('10. Tipo Contrato');
    console.log('11. Tipo ID');
    console.log('12. Tipo Novedad');
    console.log('0. Volver al Menú Principal');

    const p = await input("¿Qué colección deseas importar desde CSV? (Esto importará el archivo CSV asociado a esa colección específica): ");
    let selectedCollectionKey;

    switch (p) {
        case '1': selectedCollectionKey = 'area'; break;
        case '2': selectedCollectionKey = 'cargo'; break;
        case '3': selectedCollectionKey = 'ciudad'; break;
        case '4': selectedCollectionKey = 'concepto'; break;
        case '5': selectedCollectionKey = 'contrato'; break;
        case '6': selectedCollectionKey = 'departamento'; break;
        case '7': selectedCollectionKey = 'empleado'; break;
        case '8': selectedCollectionKey = 'nomina'; break;
        case '9': selectedCollectionKey = 'sacarNomina'; break;
        case '10': selectedCollectionKey = 'tipo_contrato'; break;
        case '11': selectedCollectionKey = 'tipo_id'; break;
        case '12': selectedCollectionKey = 'tipo_novedad'; break;
        case '0': return;
        default: console.log('Opción no válida.'); return;
    }

    const collectionName = collectionNames[selectedCollectionKey];
    const csvFilePath = path.join(process.cwd(), 'raw-data', `${collectionName}.csv`);

    try {
        const dbInstance = await connectDb();
        console.log(`Intentando importar ${collectionName}.csv a la colección ${collectionName}...`);
        await readAndInsertCsv(csvFilePath, dbInstance, collectionName);
        console.log(`Importación de ${collectionName} completada.`);
    } catch (error) {
        console.error(`Error al importar datos para ${selectedCollectionKey}:`, error.message);
    }
}


async function listItems(db) {
    console.log('\n--- Listar Ítems ---');
    console.log('Selecciona la colección a listar:');
    console.log('1. Área');
    console.log('2. Cargo');
    console.log('3. Ciudad');
    console.log('4. Concepto');
    console.log('5. Contrato');
    console.log('6. Departamento');
    console.log('7. Empleado');
    console.log('8. Nómina');
    console.log('9. Sacar Nómina');
    console.log('10. Tipo Contrato');
    console.log('11. Tipo ID');
    console.log('12. Tipo Novedad');
    console.log('0. Volver al Menú Principal');

    const p = await input("¿Qué colección deseas listar? (1-12 o 0 para volver): ");
    let selectedCollectionKey;

    switch (p) {
        case '1': selectedCollectionKey = 'area'; break;
        case '2': selectedCollectionKey = 'cargo'; break;
        case '3': selectedCollectionKey = 'ciudad'; break;
        case '4': selectedCollectionKey = 'concepto'; break;
        case '5': selectedCollectionKey = 'contrato'; break;
        case '6': selectedCollectionKey = 'departamento'; break;
        case '7': selectedCollectionKey = 'empleado'; break;
        case '8': selectedCollectionKey = 'nomina'; break;
        case '9': selectedCollectionKey = 'sacarNomina'; break;
        case '10': selectedCollectionKey = 'tipo_contrato'; break;
        case '11': selectedCollectionKey = 'tipo_id'; break;
        case '12': selectedCollectionKey = 'tipo_novedad'; break;
        case '0': return;
        default: console.log('Opción no válida.'); return;
    }

    const collectionName = collectionNames[selectedCollectionKey];
    try {
        const collection = db.collection(collectionName);
        console.log(`Buscando documentos en la colección '${collectionName}'...`);

        const items = await collection.find({}).toArray();

        if (items.length > 0) {
            console.log(`Documentos encontrados en '${collectionName}':`);
            console.table(items);
        } else {
            console.log(`No hay documentos en la colección '${collectionName}'.`);
        }
    } catch (error) {
        console.error(`Error al listar ítems de ${collectionName}:`, error);
    }
}

async function updateItem(db) {
    console.log('\n--- Actualizar Ítem ---');
    console.log('Selecciona la colección donde está el ítem a actualizar:');
    console.log('1. Área');
    console.log('2. Cargo');
    console.log('3. Ciudad');
    console.log('4. Concepto');
    console.log('5. Contrato');
    console.log('6. Departamento');
    console.log('7. Empleado');
    console.log('8. Nómina');
    console.log('9. Sacar Nómina');
    console.log('10. Tipo Contrato');
    console.log('11. Tipo ID');
    console.log('12. Tipo Novedad');
    console.log('0. Volver al Menú Principal');

    const p = await input("¿En qué colección deseas actualizar un ítem? (1-12 o 0 para volver): ");
    let selectedCollectionKey;

    switch (p) {
        case '1': selectedCollectionKey = 'area'; break;
        case '2': selectedCollectionKey = 'cargo'; break;
        case '3': selectedCollectionKey = 'ciudad'; break;
        case '4': selectedCollectionKey = 'concepto'; break;
        case '5': selectedCollectionKey = 'contrato'; break;
        case '6': selectedCollectionKey = 'departamento'; break;
        case '7': selectedCollectionKey = 'empleado'; break;
        case '8': selectedCollectionKey = 'nomina'; break;
        case '9': selectedCollectionKey = 'sacarNomina'; break;
        case '10': selectedCollectionKey = 'tipo_contrato'; break;
        case '11': selectedCollectionKey = 'tipo_id'; break;
        case '12': selectedCollectionKey = 'tipo_novedad'; break;
        case '0':
            console.log('Volviendo al menú principal.');
            return;
        default:
            console.log('Opción no válida.');
            return;
    }

    const collectionName = collectionNames[selectedCollectionKey];

    try {
        const idToUpdate = await input(`Ingresa el _id del documento en '${collectionName}' que deseas actualizar: `);

        console.log('\nIngresa los campos a actualizar (nombreCampo:nuevoValor). Presiona Enter sin escribir nada para terminar.');
        console.log('Ejemplo: nombre:Nuevo Nombre, edad:30');

        let updates = {};
        while (true) {
            const fieldInput = await input('Campo a actualizar (ej. "nombre:NuevoValor" o Enter para finalizar): ');
            if (fieldInput.trim() === '') {
                break;
            }

            const parts = fieldInput.split(':');
            if (parts.length < 2) {
                console.log('Formato incorrecto. Usa "nombreCampo:nuevoValor".');
                continue;
            }

            const fieldName = parts[0].trim();
            let fieldValue = parts.slice(1).join(':').trim();

            if (!isNaN(fieldValue) && fieldValue !== '') {
                fieldValue = Number(fieldValue);
            }
            updates[fieldName] = fieldValue;
        }

        if (Object.keys(updates).length === 0) {
            console.log('No se ingresaron campos para actualizar. Operación cancelada.');
            return;
        }

        const updateResult = await updateDocument(db, collectionName, idToUpdate, updates);

        if (updateResult.matchedCount === 0) {
            console.log(updateResult.message);
        } else if (updateResult.modifiedCount === 0) {
            console.log(updateResult.message);
        } else {
            console.log(updateResult.message);
            if (updateResult.updatedDoc) {
                console.log('\n--- Documento actualizado ---');
                console.table([updateResult.updatedDoc]);
            }
        }

    } catch (error) {
        console.error(`Error en la operación de actualización:`, error.message);
    }
}


async function deleteItem(db) {
    console.log('\n--- Eliminar Ítem ---');
    console.log('Selecciona la colección donde está el ítem a eliminar:');
    console.log('1. Área');
    console.log('2. Cargo');
    console.log('3. Ciudad');
    console.log('4. Concepto');
    console.log('5. Contrato');
    console.log('6. Departamento');
    console.log('7. Empleado');
    console.log('8. Nómina');
    console.log('9. Sacar Nómina');
    console.log('10. Tipo Contrato');
    console.log('11. Tipo ID');
    console.log('12. Tipo Novedad');
    console.log('0. Volver al Menú Principal');

    const p = await input("¿De qué colección deseas eliminar un ítem? (1-12 o 0 para volver): ");
    let selectedCollectionKey;

    switch (p) {
        case '1': selectedCollectionKey = 'area'; break;
        case '2': selectedCollectionKey = 'cargo'; break;
        case '3': selectedCollectionKey = 'ciudad'; break;
        case '4': selectedCollectionKey = 'concepto'; break;
        case '5': selectedCollectionKey = 'contrato'; break;
        case '6': selectedCollectionKey = 'departamento'; break;
        case '7': selectedCollectionKey = 'empleado'; break;
        case '8': selectedCollectionKey = 'nomina'; break;
        case '9': selectedCollectionKey = 'sacarNomina'; break;
        case '10': selectedCollectionKey = 'tipo_contrato'; break;
        case '11': selectedCollectionKey = 'tipo_id'; break;
        case '12': selectedCollectionKey = 'tipo_novedad'; break;
        case '0':
            console.log('Volviendo al menú principal.');
            return;
        default:
            console.log('Opción no válida.');
            return;
    }

    const collectionName = collectionNames[selectedCollectionKey];

    try {
        const idToDelete = await input(`Ingresa el _id del documento en '${collectionName}' que deseas eliminar: `);


        const confirmDelete = await input(`¿Estás seguro de que quieres eliminar el documento con _id: ${idToDelete} de '${collectionName}'? (s/n): `);
        if (confirmDelete.toLowerCase() !== 's') {
            console.log('Operación de eliminación cancelada.');
            return;
        }


        const deleteResult = await deleteDocument(db, collectionName, idToDelete);

        console.log(deleteResult.message);

    } catch (error) {

        console.error(`Error en la operación de eliminación:`, error.message);
    }
}

showMenu().catch(console.error);