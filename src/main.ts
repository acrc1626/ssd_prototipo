import './style.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useDatosStore } from './stores/datos'

const app = createApp(App)
app.use(createPinia())

// Carga data/datos-ejemplo.json antes de instalar el router y montar: los guards
// de ruta leen el menú por rol (que depende de los datos), así que no pueden
// correr antes de que estén listos. Ninguna pantalla maneja un estado de
// "cargando" (equivalente al provideAppInitializer que se usó en Angular).
useDatosStore()
  .cargar()
  .then(() => {
    app.use(router);
    app.mount('#app');
  });
