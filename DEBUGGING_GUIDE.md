# 🐛 Guía de Debugging con VSCode

## ⚠️ Importante: Limitaciones del Debugger

**El debugger de VSCode SOLO funcionará si:**
1. Estás ejecutando `shopify app dev` localmente
2. El túnel de Shopify CLI está activo y redirige a tu máquina local
3. Shopify está llamando a través del túnel (no directamente a producción)

**Si estás en producción o el túnel no está activo:**
- Shopify llama desde sus servidores directamente
- El debugger local NO capturará esas llamadas
- Necesitas usar logging en su lugar

---

## 🚀 Configuración del Debugger

### Opción 1: Debug con `shopify app dev` (Recomendado)

1. **Abre VSCode** en el proyecto
2. **Ve a la pestaña "Run and Debug"** (Ctrl+Shift+D)
3. **Selecciona "Debug Shopify App (Node.js)"**
4. **Presiona F5** o haz clic en "Start Debugging"

Esto iniciará `shopify app dev` en modo debug.

### Opción 2: Attach a proceso existente

Si ya tienes `shopify app dev` corriendo:

1. **Inicia el servidor con debug habilitado:**
   ```bash
   NODE_OPTIONS="--inspect" npm run dev
   ```

2. **En VSCode, selecciona "Attach to Shopify App"**
3. **Presiona F5**

---

## 🎯 Poniendo Breakpoints

### Para debuggear el endpoint de shipping-rates:

1. **Abre** `app/routes/api.shipping-rates/route.tsx`
2. **Pon un breakpoint** en la línea 15 (inicio de `action`)
3. **Pon breakpoints adicionales** en:
   - Línea 28: Después de parsear el body
   - Línea 57: Antes de buscar la comuna
   - Línea 77: Después de buscar la comuna
   - Línea 115: Antes de retornar las rates

### Para debuggear otros endpoints:

- `app/routes/webhooks.orders.paid/route.tsx` - Webhook de órdenes pagadas
- `app/routes/api.recibelo-webhook/route.tsx` - Webhook de Recibelo
- `app/utils/carrierService.ts` - Funciones del carrier service

---

## 🔍 Verificando que Funciona

### Test 1: Verificar que el debugger está conectado

1. Pon un breakpoint en `app/routes/api.shipping-rates/route.tsx` línea 15
2. Haz checkout en Shopify
3. **Si el debugger se detiene**: ✅ Funciona
4. **Si no se detiene**: ❌ Shopify no está llamando al endpoint

### Test 2: Verificar el túnel

1. Cuando ejecutas `shopify app dev`, deberías ver una URL como:
   ```
   Forwarding https://xxxxx.ngrok.io -> http://localhost:3000
   ```
2. **Verifica que esta URL sea la misma** que está configurada en el Carrier Service
3. Si no coincide, el Carrier Service está apuntando a la URL incorrecta

---

## 🛠️ Alternativas si el Debugger No Funciona

### Opción 1: Logging Detallado (Ya implementado)

El código ya tiene logging extensivo. Revisa los logs del servidor:

```bash
# En la terminal donde corre shopify app dev
# Deberías ver logs como:
📦 Shipping rates request received: { ... }
🔍 Searching for comuna: "Providencia"
```

### Opción 2: Usar `console.log` estratégicamente

Agrega logs en puntos clave:

```typescript
console.log('🔴 BREAKPOINT MANUAL - Llegó aquí');
console.log('🔴 Variables:', { destination, cityName, comunaTarifa });
```

### Opción 3: Usar `debugger;` statement

Agrega `debugger;` en el código:

```typescript
export async function action({ request }: ActionFunctionArgs) {
  debugger; // El debugger se detendrá aquí si está activo
  // ... resto del código
}
```

---

## 📋 Checklist de Debugging

Antes de debuggear, verifica:

- [ ] `shopify app dev` está corriendo
- [ ] El túnel está activo (ves una URL ngrok)
- [ ] La URL del túnel coincide con `SHOPIFY_APP_URL`
- [ ] El Carrier Service está configurado con la URL correcta
- [ ] Los breakpoints están en el código correcto
- [ ] El debugger está conectado (verás "Debugger attached" en la terminal)

---

## 🐛 Problemas Comunes

### "No se detiene en el breakpoint"

**Causas posibles:**
1. Shopify no está llamando al endpoint
2. El túnel no está activo
3. La URL del Carrier Service es incorrecta
4. El código está en producción, no en desarrollo

**Solución:**
- Verifica los logs del servidor primero
- Verifica que el Carrier Service esté activo
- Verifica la URL del callback

### "Cannot connect to debugger"

**Causas posibles:**
1. El puerto 9229 está ocupado
2. Node.js no está en modo inspect

**Solución:**
```bash
# Verifica qué está usando el puerto
netstat -ano | findstr :9229

# O cambia el puerto en launch.json
"port": 9230
```

### "Source maps not working"

**Solución:**
- Asegúrate de que `sourceMaps: true` esté en launch.json
- Verifica que los archivos TypeScript estén compilados

---

## 💡 Tips

1. **Usa "Debug Console"** en VSCode para evaluar variables
2. **Usa "Watch"** para monitorear variables específicas
3. **Usa "Call Stack"** para ver cómo llegaste a ese punto
4. **Usa "Variables"** para ver todas las variables en scope

---

## 🎯 Próximos Pasos

Si el debugger no funciona porque Shopify no está llamando:

1. **Verifica el Carrier Service** en Shopify Admin
2. **Revisa los logs** del servidor
3. **Prueba el endpoint manualmente** con curl
4. **Verifica que la URL sea accesible** públicamente

