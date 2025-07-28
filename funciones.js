import fs from "fs";
import path from "path";
import { ObjectId } from "mongodb";

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
        objectId = new ObjectId(idToUpdate); // Convertir la cadena a ObjectId
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
            // Opcional: Devolver el documento actualizado para que el menú lo muestre
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
        // Intenta convertir la cadena del _id a un objeto ObjectId de MongoDB
        objectId = new ObjectId(idToDelete); 
    } catch (err) {
        // Si la cadena no es un formato de ObjectId válido, lanza un error.
        // Este error será capturado en menus.js.
        throw new Error('El _id ingresado no es un ObjectId válido.');
    }

    try {
        const collection = db.collection(collectionName);
        console.log(`Intentando eliminar documento con _id: ${idToDelete} de la colección '${collectionName}'...`);
        
        // Ejecuta la operación de eliminación de un solo documento
        const result = await collection.deleteOne({ _id: objectId });

        if (result.deletedCount === 0) {
            // Si no se eliminó ningún documento, significa que no se encontró
            return { deletedCount: 0, message: `No se encontró ningún documento con _id: ${idToDelete} en la colección '${collectionName}'.` };
        } else {
            // Si se eliminó (deletedCount > 0, generalmente 1)
            return { deletedCount: result.deletedCount, message: `Documento con _id: ${idToDelete} eliminado correctamente de la colección '${collectionName}'.` };
        }

    } catch (error) {
        // Captura cualquier otro error de la base de datos
        console.error(`Error en deleteDocument para ${collectionName}:`, error);
        throw new Error(`Error en la operación de eliminación: ${error.message}`);
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
