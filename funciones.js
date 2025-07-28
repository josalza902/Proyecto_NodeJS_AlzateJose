import fs from "fs";
import path from "path";
import { ObjectId } from "mongodb";
import { error } from "console";

// la dejamos por si acaso nescesitamos leer los archivos csv antes de meter a la base de datos
// export async function readitem(collectionnameparam){
//     const nombreColeccion = collectionnameparam;

//     const filepath = path.join(process.cwd(),'raw-data',`${nombreColeccion}.csv`);
//     try{
//         const filecontent = fs.readFileSync(filepath,"utf-8");
//         return filecontent;
        
//     }catch(error){
//         if(error.code==='ENOENT'){
//             console.error(`Error: El archivo "${nombreColeccion}.csv" no se encontró en la ruta: ${filepath}`)
//         }else{
//             console.error("ocurrio un error inesperado",error);
//         }
//         return null;
//     }
    
// }

export async function readAndInsertCsv(csvfilepath, db, collectionName) {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(csvfilepath)) {
            return reject(new Error(`el archivo no existe en la ruta: ${csvfilepath}`));
        }

        const documents = [];
        let heads = [];
        let isfirstline = true;
        const readstream = fs.createReadStream(csvfilepath, { encoding: 'utf8' });
        let remaining = '';
        readstream.on('data', (chunck) => {
            remaining += chunck;
            let lastnewlineindex = remaining.lastIndexOf('\n');

            if (lastnewlineindex !== -1) {
                let completeData = remaining.substring(0, lastnewlineindex);
                remaining = remaining.substring(lastnewlineindex + 1);

                const lines = completeData.split('\n').filter(line => line.trim() !== '');

                for (const line of lines) {
                    if (isfirstline) {
                        heads = line.split(',').map(v => v.trim());
                        isfirstline = false;
                    } else {
                        const values = line.split(',').map(v => v.trim());
                        if (values.length === heads.length) {
                            const doc = {};
                            for (let i = 0; i < heads.length; i++) {
                                let parsedvalue = values[i];
                                if (!isNaN(parsedvalue) && parsedvalue !== '') {
                                    parsedvalue = Number(parsedvalue);
                                }
                                doc[heads[i]] = parsedvalue
                            }
                            documents.push(doc);
                        } else {
                            console.warn(`[ADvertencia]saltando linea malformada: "${line}" en ${csvfilepath}. Número de valores no coincide con los encabezados.`)
                        }

                    }
                }
            }
        });
        readstream.on('end', async () => {
            const finallines = remaining.split('\n').filter(line => line.trim() !== '');
            for (const line of finallines) {
                if (isfirstline) {
                    heads = line.split(',').map(h => h.trim());
                    isfirstline = false;
                } else {
                    const values = line.split(',').map(v => v.trim());
                    if (values.length === heads.length) {
                        const doc = {};
                        for (let i = 0; i < heads.length; i++) {
                            let parsedvalue = values[i];
                            if (!isNaN(parsedvalue) && parsedvalue !== '') {
                                parsedvalue = Number(parsedvalue);
                            }
                            doc[heads[i]] = parsedvalue;
                        }
                        documents.push(doc);
                    } else {
                        console.warn(`[ADVERTENCIA] Saltando línea malformada final: "${line}" en ${csvfilepath}.`)
                    }
                }

            }
            if (documents.length > 0) {
                try {
                    const collection = db.collection(collectionName);
                    const result = await collection.insertMany(documents);
                    console.log(`Se insertaron ${result.insertedCount} documentos en la colección '${collectionName}'.`);
                    resolve(result);
                } catch (error) {
                    console.error(`Error al insertar documentos en MongoDB para ${collectionName}:`, error);
                    reject(error);
                }
            } else {
                console.log(`No se encontraron documentos válidos para insertar en '${collectionName}' desde ${csvfilepath}.`);
                resolve({ insertedCount: 0 })
            }
        });
        readstream.on('error', (err) => {
            console.error(`Error al leer el archivo CSV ${csvfilepath}:`, err);
            reject(err)
        });
    })

}

export async function updateDocument(db, collectionName, idToUpdate, updates) {
    let objectId;
    try {
        objectId = new ObjectId(idToUpdate); 
    } catch (err) {
        throw new Error('El _id ingresado no es un ObjectId válido.');
    }

    try {
        const collection = db.collection(collectionName);

        
        const existingDoc = await collection.findOne({ _id: objectId });
         if (!existingDoc) {
             return { matchedCount: 0, modifiedCount: 0, message: 'Documento no encontrado.' };
         }

        const result = await collection.updateOne(
            { _id: objectId },
            { $set: updates } 
        );

        if (result.matchedCount === 0) {
            return { matchedCount: 0, modifiedCount: 0, message: `No se encontró el documento con _id: ${idToUpdate}.` };
        } else if (result.modifiedCount === 0) {
            return { matchedCount: result.matchedCount, modifiedCount: 0, message: 'El documento no fue modificado (los valores eran los mismos).' };
        } else {
           
            const updatedDoc = await collection.findOne({ _id: objectId });
            return {
                matchedCount: result.matchedCount,
                modifiedCount: result.modifiedCount,
                message: `Documento con _id: ${idToUpdate} actualizado correctamente.`,
                updatedDoc: updatedDoc
            };
        }

    } catch (error) {
        console.error(`Error en updateDocument para ${collectionName}:`, error);
        throw new Error(`Error en la operación de actualización: ${error.message}`);
    }
}

export async function updateItem(db){
    rl.question('ID al elemento a actualizar: ', async(id) => {
        rl.question('Nuevo Nombre: ', async (newName) => {
            const collection = db.collection(collectionName);
            try{
                const result = await collection.updateOne(
                    {_id: ObjectId.createFromHexString(id)},
                    {$set:{name: newName}}
                );
                if(result.matchedCount === 0){
                    console.log('Elemento no encontrado. ')
                }else{
                    console.log('Elemento Actualizado')
                }
            }catch(err){
                console.log("id Invalido")
            }
            showMenu();
        })
    })
}


export async function deleteItem(db){
    rl.question('ID del elemento a borrar: ', async (id)=>{
        const collection = db.collection(collectionName);
        try{
            const result = await collection.deleteOne({_id: new ObjectId(id)});
            if(result.deleteCount === 0){
                console.log('elemento no encontrado')
            }else{
                console.log('Elemento elimindo')
            }
        }catch(err){
            console.log('ID invalido')
        }
        showMenu()
    });
}

export async function deleteDocument(db, collectionName, idToDelete) {
    let objectId;
    try {
       
        objectId = new ObjectId(idToDelete); 
    } catch (err) {

        throw new Error('El _id ingresado no es un ObjectId válido.');
    }

    try {
        const collection = db.collection(collectionName);
        console.log(`Intentando eliminar documento con _id: ${idToDelete} de la colección '${collectionName}'...`);
        
        
        const result = await collection.deleteOne({ _id: objectId });

        if (result.deletedCount === 0) {
            
            return { deletedCount: 0, message: `No se encontró ningún documento con _id: ${idToDelete} en la colección '${collectionName}'.` };
        } else {
            
            return { deletedCount: result.deletedCount, message: `Documento con _id: ${idToDelete} eliminado correctamente de la colección '${collectionName}'.` };
        }

    } catch (error) {
        
        console.error(`Error en deleteDocument para ${collectionName}:`, error);
        throw new Error(`Error en la operación de eliminación: ${error.message}`);
    }
}

export async function reporte1(db) {
    try {
        console.log('Generando Reporte 1: Empleados por Área y Cargo con Contrato Vigente...');

        const empleadosConContrato = await db.collection('contratos').aggregate([
           
            { $match: { activo: true } },

            
            {
                $lookup: {
                    from: 'empleados',
                    localField: 'empleado', 
                    foreignField: '_id',      
                    as: 'empleadoInfo'
                }
            },
            { $unwind: '$empleadoInfo' }, 
            
            {
                $lookup: {
                    from: 'areas',
                    localField: 'area', 
                    foreignField: '_id',             
                    as: 'areaInfo'
                }
            },
            { $unwind: '$areaInfo' },

            
            {
                $lookup: {
                    from: 'cargos',
                    localField: 'cargo', 
                    foreignField: '_id',              
                    as: 'cargoInfo'
                }
            },
            { $unwind: '$cargoInfo' },

            
            {
                $lookup: {
                    from: 'tipos_identificaciones',
                    localField: 'empleadoInfo.tipoIdentificacion',
                    foreignField: '_id',                  
                    as: 'tipoIdInfo'
                }
            },
            { $unwind: '$tipoIdInfo' },

            
            {
                $project: {
                    _id: 0, 
                    codigoArea: '$areaInfo.codigo',
                    nombreArea: '$areaInfo.nombre',
                    codigoCargo: '$cargoInfo.codigo',
                    nombreCargo: '$cargoInfo.nombre',
                    tipoIdentificacion: '$tipoIdInfo.nombre',
                    numeroIdentificacion: '$empleadoInfo.numeroIdentificacion',
                    nombresEmpleado: '$empleadoInfo.nombres',
                    apellidosEmpleado: '$empleadoInfo.apellidos',
                    telefonoEmpleado: '$empleadoInfo.telefono',
                    emailEmpleado: '$empleadoInfo.email',
                    generoEmpleado: '$empleadoInfo.genero'
                }
            },
            
            {
                $sort: {
                    nombreArea: 1,
                    nombreCargo: 1
                }
            }
        ]).toArray();

        if (empleadosConContrato.length === 0) {
            console.log('No se encontraron empleados con contrato vigente para el reporte.');
            return;
        }

        
        let htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reporte de Empleados con Contrato Vigente</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f4f4f4; color: #333; }
        h1 { color: #0056b3; text-align: center; margin-bottom: 30px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; background-color: #fff; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        th { background-color: #007bff; color: white; cursor: pointer; }
        tr:nth-child(even) { background-color: #f2f2f2; }
        tr:hover { background-color: #e9e9e9; }
        .footer { text-align: center; margin-top: 40px; font-size: 0.9em; color: #777; }
    </style>
</head>
<body>
    <h1>Reporte de Empleados con Contrato Vigente</h1>
    <table>
        <thead>
            <tr>
                <th>Código Área</th>
                <th>Nombre Área</th>
                <th>Código Cargo</th>
                <th>Nombre Cargo</th>
                <th>Tipo ID</th>
                <th>Número ID</th>
                <th>Nombres</th>
                <th>Apellidos</th>
                <th>Teléfono</th>
                <th>Email</th>
                <th>Género</th>
            </tr>
        </thead>
        <tbody>
`;

        empleadosConContrato.forEach(emp => {
            htmlContent += `
            <tr>
                <td>${emp.codigoArea || ''}</td>
                <td>${emp.nombreArea || ''}</td>
                <td>${emp.codigoCargo || ''}</td>
                <td>${emp.nombreCargo || ''}</td>
                <td>${emp.tipoIdentificacion || ''}</td>
                <td>${emp.numeroIdentificacion || ''}</td>
                <td>${emp.nombresEmpleado || ''}</td>
                <td>${emp.apellidosEmpleado || ''}</td>
                <td>${emp.telefonoEmpleado || ''}</td>
                <td>${emp.emailEmpleado || ''}</td>
                <td>${emp.generoEmpleado || ''}</td>
            </tr>`;
        });

        htmlContent += `
        </tbody>
    </table>
    <div class="footer">
        <p>Reporte generado el ${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}</p>
    </div>
</body>
</html>`;
        

        const reportFilePath = path.join(process.cwd(), 'lista_de_empleados.html'); 
        fs.writeFile(reportFilePath, htmlContent, (error) => {
            if (error) {
                console.error('Error al escribir el archivo de reporte HTML:', error);
            } else {
                console.log(`Reporte "lista_de_empleados.html" generado exitosamente en: ${reportFilePath}`);
            }
        });

    } catch (error) {
        console.error('Error al generar el reporte de empleados:', error);
    }
}
export async function reporte2(db, empleadoId, nominaId) {
    try {
        console.log(`Generando Reporte 2: Detalle de Nómina para Empleado ${empleadoId} y Nómina ${nominaId}...`);

        let empleadoObjectId;
        let nominaObjectId;

        try {
            empleadoObjectId = new ObjectId(empleadoId);
            nominaObjectId = new ObjectId(nominaId);
        } catch (err) {
            console.error('Error: El ID del empleado o de la nómina no es un ObjectId válido.');
            return;
        }

        const reportData = await db.collection('nominas').aggregate([
            
            {
                $match: {
                    _id: nominaObjectId,
                    id_empleado: empleadoObjectId
                }
            },
            
            {
                $lookup: {
                    from: 'empleados',
                    localField: 'id_empleado',
                    foreignField: '_id',
                    as: 'empleadoInfo'
                }
            },
            { $unwind: '$empleadoInfo' },
            
            {
                $lookup: {
                    from: 'tipos_identificaciones',
                    localField: 'empleadoInfo.tipoIdentificacion', 
                    foreignField: '_id',
                    as: 'tipoIdInfo'
                }
            },
            { $unwind: '$tipoIdInfo' },
            
            {
                $lookup: {
                    from: 'contratos',
                    let: { empleadoId: '$id_empleado' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$empleado', '$$empleadoId'] }, activo: true } },
                        { $limit: 1 } 
                    ],
                    as: 'contratoInfo'
                }
            },
            { $unwind: { path: '$contratoInfo', preserveNullAndEmptyArrays: true } }, 

            
            {
                $lookup: {
                    from: 'sacarNominas',
                    localField: '_id',
                    foreignField: 'nomina_id',
                    as: 'conceptosNomina'
                }
            },
            
            { $unwind: '$conceptosNomina' },
            
            {
                $lookup: {
                    from: 'conceptos',
                    localField: 'conceptosNomina.concepto_id',
                    foreignField: '_id',
                    as: 'conceptoDetalle'
                }
            },
            { $unwind: '$conceptoDetalle' },
            
            {
                $lookup: {
                    from: 'tipos_novedades',
                    localField: 'conceptosNomina.tipo_novedad_id',
                    foreignField: '_id',
                    as: 'tipoNovedadDetalle'
                }
            },
            { $unwind: '$tipoNovedadDetalle' },

            
            {
                $group: {
                    _id: '$_id', 
                    tipoIdentificacion: { $first: '$tipoIdInfo.nombre' },
                    numeroIdentificacion: { $first: '$empleadoInfo.numeroIdentificacion' },
                    nombres: { $first: '$empleadoInfo.nombres' },
                    apellidos: { $first: '$empleadoInfo.apellidos' },
                    salarioBase: { $first: '$contratoInfo.salarioBase' }, 

                    
                    deducciones: {
                        $push: {
                            $cond: {
                                if: { $eq: ['$tipoNovedadDetalle.nombre', 'Deducción'] }, 
                                then: {
                                    codigo: '$conceptoDetalle.codigo', 
                                    nombre: '$conceptoDetalle.nombre',
                                    valor: '$conceptosNomina.valor'
                                },
                                else: '$$REMOVE' 
                            }
                        }
                    },
                    devengos: {
                        $push: {
                            $cond: {
                                if: { $eq: ['$tipoNovedadDetalle.nombre', 'Devengo'] }, 
                                then: {
                                    codigo: '$conceptoDetalle.codigo',
                                    nombre: '$conceptoDetalle.nombre',
                                    valor: '$conceptosNomina.valor'
                                },
                                else: '$$REMOVE' 
                            }
                        }
                    }
                }
            },
            
            {
                $project: {
                    _id: 0,
                    tipoIdentificacion: 1,
                    numeroIdentificacion: 1,
                    nombres: 1,
                    apellidos: 1,
                    salarioBase: 1,
                    deducciones: 1,
                    devengos: 1
                }
            }
        ]).toArray();


        if (reportData.length === 0) {
            console.log(`No se encontraron datos de nómina para el empleado ${empleadoId} y nómina ${nominaId}.`);
            return;
        }

        const data = reportData[0]; 

        
        let htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Detalle de Nómina</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f4f4f4; color: #333; }
        .container { max-width: 900px; margin: auto; background-color: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1); }
        h1 { color: #0056b3; text-align: center; margin-bottom: 30px; }
        h2 { color: #007bff; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-top: 25px; }
        p strong { color: #555; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        th { background-color: #f2f2f2; }
        .footer { text-align: center; margin-top: 40px; font-size: 0.8em; color: #777; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Detalle de Nómina por Empleado</h1>

        <h2>Información del Empleado</h2>
        <p><strong>Tipo de Identificación:</strong> ${data.tipoIdentificacion || 'N/A'}</p>
        <p><strong>Número de Identificación:</strong> ${data.numeroIdentificacion || 'N/A'}</p>
        <p><strong>Nombres:</strong> ${data.nombres || 'N/A'}</p>
        <p><strong>Apellidos:</strong> ${data.apellidos || 'N/A'}</p>
        <p><strong>Salario Base:</strong> ${data.salarioBase ? `$${data.salarioBase.toLocaleString('es-CO')}` : 'N/A'}</p>

        <h2>Devengos</h2>
        ${data.devengos && data.devengos.length > 0 ? `
        <table>
            <thead>
                <tr>
                    <th>Código</th>
                    <th>Nombre</th>
                    <th>Valor</th>
                </tr>
            </thead>
            <tbody>
                ${data.devengos.map(d => `
                <tr>
                    <td>${d.codigo || ''}</td>
                    <td>${d.nombre || ''}</td>
                    <td>$${d.valor ? d.valor.toLocaleString('es-CO') : '0'}</td>
                </tr>`).join('')}
            </tbody>
        </table>` : '<p>No se encontraron devengos.</p>'}

        <h2>Deducciones</h2>
        ${data.deducciones && data.deducciones.length > 0 ? `
        <table>
            <thead>
                <tr>
                    <th>Código</th>
                    <th>Nombre</th>
                    <th>Valor</th>
                </tr>
            </thead>
            <tbody>
                ${data.deducciones.map(d => `
                <tr>
                    <td>${d.codigo || ''}</td>
                    <td>${d.nombre || ''}</td>
                    <td>$${d.valor ? d.valor.toLocaleString('es-CO') : '0'}</td>
                </tr>`).join('')}
            </tbody>
        </table>` : '<p>No se encontraron deducciones.</p>'}
    </div>
    <div class="footer">
        <p>Reporte generado el ${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}</p>
        <p>Para Empleado ID: ${empleadoId}, Nómina ID: ${nominaId}</p>
    </div>
</body>
</html>`;

        const reportFilePath = path.join(process.cwd(), `detalle_nomina_${empleadoId}_${nominaId}.html`);
        fs.writeFile(reportFilePath, htmlContent, (error) => {
            if (error) {
                console.error('Error al escribir el archivo de reporte HTML:', error);
            } else {
                console.log(`Reporte "detalle_nomina_${empleadoId}_${nominaId}.html" generado exitosamente en: ${reportFilePath}`);
            }
        });

    } catch (error) {
        console.error('Error al generar el reporte de detalle de nómina:', error);
    }
}
const dos_smlmv = 2800000
export async function reporte3(db) {
    try {
        console.log('Generando Reporte 3: Empleados con Auxilio de Transporte...');

        const empleadosConAuxilio = await db.collection('contratos').aggregate([
            
            { $match: { activo: true } },

            
            {
                $lookup: {
                    from: 'empleados',
                    localField: 'empleado', 
                    foreignField: '_id',      
                    as: 'empleadoInfo'
                }
            },
            { $unwind: '$empleadoInfo' },
            
            
            {
                $match: {
                    'empleadoInfo.salario_base': { $lte: dos_smlmv } 
                }
            },

            
            {
                $lookup: {
                    from: 'areas',
                    localField: 'area', 
                    foreignField: '_id',
                    as: 'areaInfo'
                }
            },
            { $unwind: '$areaInfo' },

            
            {
                $lookup: {
                    from: 'cargos',
                    localField: 'cargo', 
                    foreignField: '_id',
                    as: 'cargoInfo'
                }
            },
            { $unwind: '$cargoInfo' },

            
            {
                $lookup: {
                    from: 'tipos_identificaciones',
                    localField: 'empleadoInfo.tipoIdentificacion', 
                    foreignField: '_id',
                    as: 'tipoIdInfo'
                }
            },
            { $unwind: '$tipoIdInfo' },

            
            {
                $project: {
                    _id: 0, 
                    codigoArea: '$areaInfo.codigo',
                    nombreArea: '$areaInfo.nombre',
                    codigoCargo: '$cargoInfo.codigo',
                    nombreCargo: '$cargoInfo.nombre',
                    tipoIdentificacion: '$tipoIdInfo.nombre',
                    numeroIdentificacion: '$empleadoInfo.numeroIdentificacion',
                    nombresEmpleado: '$empleadoInfo.nombres',
                    apellidosEmpleado: '$empleadoInfo.apellidos',
                    salarioBaseEmpleado: '$empleadoInfo.salario_base'
                }
            },
           
            {
                $sort: {
                    nombreArea: 1,
                    nombreCargo: 1,
                    apellidosEmpleado: 1
                }
            }
        ]).toArray();

        if (empleadosConAuxilio.length === 0) {
            console.log('No se encontraron empleados con contrato vigente que tengan derecho a auxilio de transporte.');
            return;
        }

       
        let htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reporte de Empleados con Auxilio de Transporte</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f4f4f4; color: #333; }
        .container { max-width: 1200px; margin: auto; background-color: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1); }
        h1 { color: #0056b3; text-align: center; margin-bottom: 30px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        th { background-color: #007bff; color: white; cursor: pointer; }
        tr:nth-child(even) { background-color: #f2f2f2; }
        tr:hover { background-color: #e9e9e9; }
        .footer { text-align: center; margin-top: 40px; font-size: 0.9em; color: #777; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Reporte de Empleados con Contrato Vigente y Auxilio de Transporte</h1>
        <p>Este reporte incluye empleados con un salario base igual o inferior a $${DOS_SMLMV.toLocaleString('es-CO')} (aproximadamente 2 SMLMV).</p>
        <table>
            <thead>
                <tr>
                    <th>Código Área</th>
                    <th>Nombre Área</th>
                    <th>Código Cargo</th>
                    <th>Nombre Cargo</th>
                    <th>Tipo ID</th>
                    <th>Número ID</th>
                    <th>Nombres</th>
                    <th>Apellidos</th>
                    <th>Salario Base</th>
                </tr>
            </thead>
            <tbody>
                ${empleadosConAuxilio.map(emp => `
                <tr>
                    <td>${emp.codigoArea || ''}</td>
                    <td>${emp.nombreArea || ''}</td>
                    <td>${emp.codigoCargo || ''}</td>
                    <td>${emp.nombreCargo || ''}</td>
                    <td>${emp.tipoIdentificacion || ''}</td>
                    <td>${emp.numeroIdentificacion || ''}</td>
                    <td>${emp.nombresEmpleado || ''}</td>
                    <td>${emp.apellidosEmpleado || ''}</td>
                    <td>$${emp.salarioBaseEmpleado ? emp.salarioBaseEmpleado.toLocaleString('es-CO') : '0'}</td>
                </tr>`).join('')}
            </tbody>
        </table>
    </div>
    <div class="footer">
        <p>Reporte generado el ${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}</p>
    </div>
</body>
</html>`;

        const reportFilePath = path.join(process.cwd(), 'empleados_auxilio_transporte.html');
        fs.writeFile(reportFilePath, htmlContent, (error) => {
            if (error) {
                console.error('Error al escribir el archivo de reporte HTML:', error);
            } else {
                console.log(`Reporte "empleados_auxilio_transporte.html" generado exitosamente en: ${reportFilePath}`);
            }
        });

    } catch (error) {
        console.error('Error al generar el reporte de empleados con auxilio de transporte:', error);
    }
}

export async function reporte4(db, codigoNomina) {
    try {
        console.log(`Generando Reporte 4: Resumen de Nómina para Código ${codigoNomina}...`);

        const reportData = await db.collection('nominas').aggregate([
            // 1. Filtrar por el código de la nómina
            { $match: { codigo: codigoNomina } },

            // 2. Unir con la información del empleado
            {
                $lookup: {
                    from: 'empleados',
                    localField: 'id_empleado',
                    foreignField: '_id',
                    as: 'empleadoInfo'
                }
            },
            { $unwind: '$empleadoInfo' },
            
            // 3. Unir con el tipo de identificación del empleado
            {
                $lookup: {
                    from: 'tipos_identificaciones',
                    localField: 'empleadoInfo.tipoIdentificacion', // Campo en 'empleados'
                    foreignField: '_id',
                    as: 'tipoIdInfo'
                }
            },
            { $unwind: '$tipoIdInfo' },

            // 4. Unir con las entradas de 'sacarNominas' para esta nómina
            {
                $lookup: {
                    from: 'sacarNominas',
                    localField: '_id', // El _id de la nómina actual
                    foreignField: 'nomina_id',
                    as: 'conceptosNomina'
                }
            },
            // 5. Desestructurar los conceptos uno por uno para poder sumarlos
            { $unwind: { path: '$conceptosNomina', preserveNullAndEmptyArrays: true } }, // preserveNullAndEmptyArrays para incluir nóminas sin conceptos
            
            // 6. Unir con el tipo de novedad para distinguir devengos/deducciones
            {
                $lookup: {
                    from: 'tipos_novedades',
                    localField: 'conceptosNomina.tipo_novedad_id',
                    foreignField: '_id',
                    as: 'tipoNovedadDetalle'
                }
            },
            { $unwind: { path: '$tipoNovedadDetalle', preserveNullAndEmptyArrays: true } },

            // 7. Agrupar para sumar los devengos y deducciones para cada nómina/empleado
            {
                $group: {
                    _id: '$_id', // Agrupar por el ID de la nómina
                    nominaCodigo: { $first: '$codigo' },
                    tipoIdentificacion: { $first: '$tipoIdInfo.nombre' },
                    numeroIdentificacion: { $first: '$empleadoInfo.numeroIdentificacion' },
                    nombres: { $first: '$empleadoInfo.nombres' },
                    apellidos: { $first: '$empleadoInfo.apellidos' },
                    salarioBase: { $first: '$empleadoInfo.salario_base' }, // Salario base del empleado

                    totalDeducciones: {
                        $sum: {
                            $cond: {
                                if: { $eq: ['$tipoNovedadDetalle.nombre', 'Deducción'] }, // Asume el nombre es 'Deducción'
                                then: '$conceptosNomina.valor',
                                else: 0
                            }
                        }
                    },
                    totalDevengos: {
                        $sum: {
                            $cond: {
                                if: { $eq: ['$tipoNovedadDetalle.nombre', 'Devengo'] }, // Asume el nombre es 'Devengo'
                                then: '$conceptosNomina.valor',
                                else: 0
                            }
                        }
                    }
                }
            },
            // 8. Calcular el neto a pagar y proyectar el formato final
            {
                $project: {
                    _id: 0,
                    nominaCodigo: 1,
                    tipoIdentificacion: 1,
                    numeroIdentificacion: 1,
                    nombres: 1,
                    apellidos: 1,
                    salarioBase: 1,
                    totalDeducciones: 1,
                    totalDevengos: 1,
                    netoAPagar: { $add: ['$salarioBase', '$totalDevengos', { $multiply: ['$totalDeducciones', -1] }] } // Salario Base + Devengos - Deducciones
                }
            }
        ]).toArray();

        if (reportData.length === 0) {
            console.log(`No se encontró ninguna nómina con el código "${codigoNomina}" o datos asociados.`);
            return;
        }

        // --- Generación del Contenido HTML ---
        let htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Resumen de Nómina por Código</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f4f4f4; color: #333; }
        .container { max-width: 1000px; margin: auto; background-color: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1); }
        h1 { color: #0056b3; text-align: center; margin-bottom: 30px; }
        h2 { color: #007bff; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-top: 25px; }
        p strong { color: #555; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        th { background-color: #f2f2f2; }
        .total-row td { font-weight: bold; background-color: #e0e0e0; }
        .neto-pagar { background-color: #d4edda; font-weight: bold; } /* Estilo para el neto a pagar */
        .footer { text-align: center; margin-top: 40px; font-size: 0.8em; color: #777; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Resumen de Nómina: ${codigoNomina}</h1>
        <table>
            <thead>
                <tr>
                    <th>Tipo ID</th>
                    <th>Número ID</th>
                    <th>Nombres</th>
                    <th>Apellidos</th>
                    <th>Salario Base</th>
                    <th>Total Devengos</th>
                    <th>Total Deducciones</th>
                    <th>Neto a Pagar</th>
                </tr>
            </thead>
            <tbody>
                ${reportData.map(data => `
                <tr>
                    <td>${data.tipoIdentificacion || ''}</td>
                    <td>${data.numeroIdentificacion || ''}</td>
                    <td>${data.nombres || ''}</td>
                    <td>${data.apellidos || ''}</td>
                    <td>$${data.salarioBase ? data.salarioBase.toLocaleString('es-CO') : '0'}</td>
                    <td>$${data.totalDevengos ? data.totalDevengos.toLocaleString('es-CO') : '0'}</td>
                    <td>$${data.totalDeducciones ? data.totalDeducciones.toLocaleString('es-CO') : '0'}</td>
                    <td class="neto-pagar">$${data.netoAPagar ? data.netoAPagar.toLocaleString('es-CO') : '0'}</td>
                </tr>`).join('')}
            </tbody>
        </table>
    </div>
    <div class="footer">
        <p>Reporte generado el ${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}</p>
        <p>Código de Nómina: ${codigoNomina}</p>
    </div>
</body>
</html>`;

        const reportFilePath = path.join(process.cwd(), `resumen_nomina_${codigoNomina}.html`);
        fs.writeFile(reportFilePath, htmlContent, (error) => {
            if (error) {
                console.error('Error al escribir el archivo de reporte HTML:', error);
            } else {
                console.log(`Reporte "resumen_nomina_${codigoNomina}.html" generado exitosamente en: ${reportFilePath}`);
            }
        });

    } catch (error) {
        console.error('Error al generar el reporte de resumen de nómina:', error);
    }
}

// export async function listItems(db){
//     const collection = db.collection(collectionName)
//     const items = await collection.find().toArray();

//     console.log('Lista de elementos')
//     items.forEach((item) => {
//         console.log(`ID: ${item._id} - Nombre: ${item.name}`)
//     });
//     showMenu(db);
// }

// export async function updateItem(db){
//     rl.question('ID al elemento a actualiozar: ', async(id) => {
//         rl.question('Nuevo Nombre: ', async (newName) => {
//             const collection = db.collection(collectionName);
//             try{
//                 const result = await collection.updateOne(
//                     {_id: ObjectId.createFromHexString(id)},
//                     {$set:{name: newName}}
//                 );
//                 if(result.matchedCount === 0){
//                     console.log('Elemento no encontrado. ')
//                 }else{
//                     console.log('Elemento Actualizado')
//                 }
//             }catch(err){
//                 console.log("id Invalido")
//             }
//             showMenu();
//         })
//     })
// }


// export async function deleteItem(db){
//     rl.question('ID del elemento a borrar: ', async (id)=>{
//         const collection = db.collection(collectionName);
//         try{
//             const result = await collection.deleteOne({_id: new ObjectId(id)});
//             if(result.deleteCount === 0){
//                 console.log('elemento no encontrado')
//             }else{
//                 console.log('Elemento elimindo')
//             }
//         }catch(err){
//             console.log('ID invalido')
//         }
//         showMenu()
//     });
// }
