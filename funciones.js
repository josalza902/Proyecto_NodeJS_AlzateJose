import fs from "fs";
import path from "path";

export async function readitem(collectionnameparam){
    const nombreColeccion = collectionnameparam;

    const filepath = path.join(process.cwd(),'raw-data',`${nombreColeccion}.csv`);
    try{
        const filecontent = fs.readFileSync(filepath,"utf-8");
        return filecontent;
    }catch(error){
        if(error.code==='ENOENT'){
            console.error(`Error: El archivo "${nombreColeccion}.csv" no se encontró en la ruta: ${filepath}`)
        }else{
            console.error("ocurrio un error inesperado",error);
        }
        return null;
    }
}


export async function listItems(db){
    const collection = db.collection(collectionName)
    const items = await collection.find().toArray();

    console.log('Lista de elementos')
    items.forEach((item) => {
        console.log(`ID: ${item._id} - Nombre: ${item.name}`)
    });
    showMenu(db);
}

export async function updateItem(db){
    rl.question('ID al elemento a actualiozar: ', async(id) => {
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
