import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import '@/styles/base.css';
import App from './App.vue';
import router from './router';
import { setupStore } from './stores';

const app = createApp(App);
setupStore(app);
app.use(router);
app.use(ElementPlus, { size: 'default' });
app.mount('#app');
