# Xiaomi Trainer v45.0

Entrega basada en `xiaomi-trainer-app(4).zip` y en las indicaciones de `Mejoras APP(2).docx`.

## Cambios incluidos

- El título de la pestaña permanece como **Xiaomi Trainer** en todas las secciones.
- Dashboard:
  - cabecera de filtros más compacta, con icono y texto alineados;
  - paneles de gráficas, rendimiento e historial unificados con el diseño actual;
  - etiquetas numéricas de barras reposicionadas para que no se corten;
  - redimensionado explícito de Chart.js al cambiar de viewport u orientación.
- Calendario:
  - leyenda plegable con flecha y estado inicial cerrado;
  - filtro de formador restaurado;
  - selector de fin de semana visible en móvil;
  - semanas adaptadas para mostrar formador y los siete días sin scroll lateral;
  - nombres largos, incluido Francisco Javier, admiten dos líneas;
  - botones de copiar y borrar ocultos dentro de las celdas en móvil;
  - borrado individual para cada una de las dos copias del portapapeles.
- Materiales:
  - las siete categorías se distribuyen en una cuadrícula adaptable;
  - se elimina el scroll lateral de categorías en móvil.
- Vacaciones:
  - saldos apilados en tarjetas compactas sin carrusel lateral;
  - calendario anual y paneles redimensionados para móvil y tablet;
  - meses y días visibles sin cortes ni desbordamiento horizontal.
- Caché PWA y versiones de recursos actualizados a `v45.0`.

## Validación

- Sintaxis JavaScript comprobada en los archivos modificados.
- Pruebas en navegador real a 360, 390, 768, 1024 y 1440 px.
- Rutas comprobadas: Dashboard, Calendario, Vacaciones y Materiales.
- Sin desbordamiento horizontal del documento.
- Sin errores de consola durante los recorridos con datos simulados.
- Portapapeles validado con dos copias y borrado individual.
