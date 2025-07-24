import  readline  from 'readline';
import { MongoClient, ObjectId } from "mongodb";
import fs from "fs";

import * as h from "./funciones.js";



const test = fs.readFileSync("./JOSEXCEL.csv","utf-8")
console.log(test)

const url = 'mongodb://localhost:27017'
const dbName = 'nominaAcme'
const collectionName = {
    empleado: 'empleados',
};

const client =  new MongoClient(url)


const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
})

function input(pregunta) {
    return new Promise(resolve => rl.question(pregunta, resolve));
}

function showMenu(db){
    console.log('menu')
    console.log('crear')
    console.log('listar')
    console.log('actualizar')
    console.log('eliminar')
    console.log('salir')
    rl.question('Seleciona una opcion', opt => {
        switch(opt){
            case '1':
                createItem(db);
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
    const p = await input("que coleccion deseas")
    if (p === "1"){
        return h.createItem(dbName,collectionName.empleado)
    }
}


async function main(){
    try{
        await client.connect();
        const db = client.db(dbName);
        showMenu(db);
    }catch(err){
        console.log('Error de conexion: ', err);
        rl.close;
    }
}

main();

rl.on("close", ()=>{
    client.close();
    console.log('Aplicacion finalizada')
    process.exit(0);
})