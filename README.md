# remitos-martin

App web para celular que genera remitos en PDF. Sin backend: funciona en GitHub Pages.

## Archivos

- `index.html`, `styles.css`, `app.js`: la app.
- `fields.json`: datos fijos de la cabecera (marca, dirección, CUIT, etc.), punto de venta y número inicial.

## Numeración

El número tiene formato `N° 00001-00000001`. El punto de venta sale de `puntoVenta` en `fields.json`.
El contador no se puede escribir en el JSON desde GitHub Pages porque el sitio es solo lectura,
así que se guarda en el navegador del dispositivo (localStorage) junto con el historial de remitos.

- `numeroInicial` en `fields.json` se usa solo la primera vez que se abre la app en un dispositivo.
- El formulario muestra el próximo número ya cargado y se puede editar antes de generar. El siguiente remito continúa desde el número usado.
- En **Ajustes** se puede corregir el próximo número a mano.
- En **Ajustes** también se puede exportar e importar un respaldo (contador + historial) para pasar a otro teléfono.

## Contraseña

Al abrir la app pide una contraseña, definida en `password` dentro de `fields.json` (no distingue mayúsculas).
Es una barrera simple del lado del cliente: cualquiera que lea el código fuente puede verla. No protege datos sensibles.

## Probar en local

`fetch` de `fields.json` no funciona abriendo el archivo directo, hace falta un servidor:

```
python3 -m http.server 8000
```

y entrar a http://localhost:8000

## Deploy en GitHub Pages

1. Subir los archivos a la rama `main`.
2. En el repo: Settings > Pages > Source: "Deploy from a branch", rama `main`, carpeta `/ (root)`.
3. La app queda en `https://<usuario>.github.io/remitos-martin/`.

En el celular, abrir la URL y usar "Agregar a pantalla de inicio" para tenerla como app.
