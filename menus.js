import  readline  from 'readline';
import { MongoClient, ObjectId } from "mongodb";
import fs from "fs";

import {readitem} from'./funciones.js';



// const test = fs.readFileSync("./JOSEXCEL.csv","utf-8")
// console.log(test)

 const url = 'mongodb://localhost:27017'
 const dbName = 'nominaAcme'
const collectionName = {
    area:'areas',
    cargo:'cargos',
    ciudad:'ciudades',
    concepto:'conceptos',
    contrato:'contratos',
    departamento:'departamentos',
    empleado: 'empleados',
    nomina:'nominas',
    sacarNomina:'sacarNominas',
    tipo_contrato:'tipos_contratos',
    tipo_id:'tipos_identificaciones',
    tipo_novedad:'tipos_novedades'
};

// const client =  new MongoClient(url)


const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
})

function input(pregunta) {
    return new Promise(resolve => rl.question(pregunta, resolve));
}

function showMenu(){
    console.log('menu')
    console.log('guardar data en base de datos desde csv')
    console.log('listar')
    console.log('actualizar')
    console.log('eliminar')
    console.log('salir')
    rl.question('Seleciona una opcion', async opt => {
        switch(opt){
            case '1':
                await askdb();
                break;
            case '2':
                listItems(db);
                break;
            case '3':
                updateItem(db);
                break;
            case '4':
                deleteItem(db);
                break;
            case '5':
                rl.close();
                break;
            default:
                console.log('Opcion Invalida. ')
                showMenu();
        }
    })
}
async function askdb (){

    console.log('1. area')
    console.log('2. cargo')
    console.log('3. ciudad')
    console.log('4. concepto')
    console.log('5. contrato')
    console.log('6. departamento')
    console.log('7. empleado')
    console.log('8. nomina')
    console.log('9. sacarnomina')
    console.log('10. tipo_contrato')
    console.log('11. tipo_id')
    console.log('12. tipo_novedad')
    const p = await input("que coleccion deseas");
    let selectedcollection = '';
    switch(p){
        case'1':
            selectedcollection= collectionName.area; break;
        // case'2':
        //     return createItem(dbName,collectionName.cargo);
        // case'3':
        //     return createItem(dbName,collectionName.ciudad);
        // case'4':
        //     return createItem(dbName,collectionName.concepto);
        // case'5':
        //     return createItem(dbName,collectionName.contrato);
        // case'6':
        //     return createItem(dbName,collectionName.departamento);
        // case'7':
        //     return createItem(dbName,collectionName.empleado);
        // case'8':
        //     return createItem(dbName,collectionName.nomina);
        // case'9':
        //     return createItem(dbName,collectionName.sacarNomina);
        // case'10':
        //     return createItem(dbName,collectionName.tipo_contrato);
        // case'11':
        //     return createItem(dbName,collectionName.tipo_id);
        // case'12':
        //     return createItem(dbName,collectionName.tipo_id);
         default:
            console.log('opcion no valida')
            showMenu();
            return;
    }
    const filecontent = await readitem(selectedcollection);
    if (filecontent !== null){
        console.table(filecontent)
    }else{
        console.log("no se pudo mostrar el contenido")
    }

}
showMenu()


// async function main(){
//     try{
//         await client.connect();
//         const db = client.db(dbName);
//         showMenu(db);
//     }catch(err){
//         console.log('Error de conexion: ', err);
//         rl.close;
//     }
// }

// main();

// rl.on("close", ()=>{
//     client.close();
//     console.log('Aplicacion finalizada')
//     process.exit(0);
// })