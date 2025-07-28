import readline from 'readline';
import fs from "fs";
// import * as h from "./funciones.js";
const collectionName = {
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
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
})
function input(pregunta) {
    return new Promise(resolve => rl.question(pregunta, resolve));
}
function showMenu() {
    console.log('menu')
    console.log('crear')
    console.log('listar')
    console.log('actualizar')
    console.log('eliminar')
    console.log('salir')
    rl.question('Seleciona una opcion', opt => {
        switch (opt) {
            case '1':
                askdb();
                break;
            default:
                console.log('Opcion Invalida. ')
                showMenu();
        }
    })
}
async function askdb() {
    const p = await input("que coleccion deseas")
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
    switch (p) {
        case '1':
            await readitem(collectionName.area);
            break;

        default:
            console.log('Opcion Invalida. ')
            showMenu();
    }
}

async function readitem(nombreColeccionparametro) {
    const nombreColeccion= nombreColeccionparametro
    
    const test = fs.readFileSync(`./raw-data/${nombreColeccion}.csv`, "utf-8")
    console.log(test)
    showMenu()
}

showMenu()