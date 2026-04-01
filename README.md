# 🐱 Michipay

> **Divide la cuenta, no la amistad.**
> Michipay es una dApp (Aplicación Descentralizada) construida sobre **Starknet** que permite a grupos de personas dividir gastos y recolectar los pagos correspondientes de manera automatizada, transparente y segura.

## 📖 Sobre el proyecto

¿Saliste a cenar con amigos y les tocó dividir la cuenta? Michipay elimina la fricción de cobrarle a cada persona. A través de la red de Starknet, cualquier usuario puede crear una "cuenta" (sesión de pago), asignar a los participantes y dejar que los contratos inteligentes se encarguen de registrar quién ya pagó y quién sigue debiendo, todo con comisiones bajísimas.

Este proyecto fue desarrollado utilizando [Scaffold-Stark 2](https://github.com/Scaffold-Stark/scaffold-stark-2), una suite de herramientas diseñada para iterar rápidamente tanto en el desarrollo de contratos inteligentes en Cairo como en la interfaz de usuario.

*Nota técnica:* Michipay ha sido optimizado y configurado específicamente para operar en la red **Starknet Sepolia Testnet** de manera nativa, facilitando el desarrollo y las pruebas comunitarias.

## 🌐 Demo en Vivo

Puedes probar la aplicación desplegada actualmente en:  
🚀 **[michipay-dapp.vercel.app](https://michipay-dapp.vercel.app/)**

## ✨ Características Principales

* 📝 **Creación de Cuentas:** Crea un nuevo evento (ej. "Cena del viernes", "Viaje a la playa") y establece el monto total a dividir.
* 👥 **División Personalizada:** Agrega las direcciones (wallets) de los participantes y define cuánto le toca pagar a cada uno.
* 💳 **Pagos On-Chain:** Los usuarios pueden conectar su wallet (como ArgentX o Braavos) en red Sepolia y realizar su pago directamente a través de la dApp.
* 📊 **Seguimiento en Tiempo Real:** Interfaz clara e intuitiva para ver el progreso de recolección y saber quiénes faltan por pagar.
* 🔒 **Descentralizado y Seguro:** Todo el estado de los pagos y las transacciones vive y se ejecuta en la blockchain de Starknet.

## 🛠️ Tecnologías Utilizadas

* **Red Blockchain:** [Starknet Sepolia Testnet](https://www.starknet.io/) (Layer 2 de Ethereum basado en ZK-Rollup)
* **Framework Web3:** [Scaffold-Stark 2](https://github.com/Scaffold-Stark/scaffold-stark-2)
* **Contratos Inteligentes:** Cairo 2.x
* **Frontend:** Next.js, React, Tailwind CSS
* **Librería de Interacción:** starknet.js (v6.11.0+) y @starknet-react/core

## 🚀 Guía de Inicio Rápido

Sigue estos pasos para instalar y desplegar tu propia instancia de Michipay en la red de pruebas Sepolia.

### 📋 Requisitos previos

Antes de comenzar, asegúrate de tener instalado:
* [Node.js](https://nodejs.org/) (>= v18.17)
* Yarn (v1 o v2+) o npm
* [Scarb v2.12.2](https://docs.swmansion.com/scarb/download.html) (**Importante:** Se requiere usar la versión 2.12.2 de Scarb para que sea 100% compatible con starknet.js y evitar problemas de discrepancia de clase o *Compiled class hash mismatch*).
* Git

### 🔧 Instalación y Despliegue en Sepolia

1. **Clona el repositorio e instala las dependencias:**
   Recomendamos usar `npm install` o `yarn install` en la raíz del proyecto.
   ```bash
   git clone https://github.com/BeyonderCrypto/michipay.git
   cd michipay
   yarn install
   ```

2. **Configura tus variables de entorno (.env):**
   Debes configurar dos archivos, uno para los contratos inteligentes y otro para la interfaz gráfica.

   *Para los Contratos Inteligentes:*
   Dirígete a la carpeta de contratos y crea tu archivo de entorno a partir de la plantilla:
   ```bash
   cd packages/snfoundry
   cp .env.example .env
   ```
   Abre el archivo `.env` recién creado y asegúrate de proveer las credenciales necesarias de tu cuenta en Sepolia (con fondos de prueba en ETH o STRK):
   * `ACCOUNT_ADDRESS`: y `PRIVATE_KEY`: La dirección y llave privada de tu cuenta en Sepolia, encargada de firmar la transacción de despliegue.
   * `RPC_URL`: Ingresa el endpoint RPC válido correspondiente a Starknet Sepolia Testnet (por ejemplo, de Alchemy).

   *Para tu Interfaz Web (Frontend):*
   Desde la raíz del proyecto, ingresa a la carpeta Next.js:
   ```bash
   cd ../nextjs
   cp .env.example .env.local
   ```
   Abre el archivo `.env.local` y agrega tus endpoints en las variables como `NEXT_PUBLIC_SEPOLIA_PROVIDER_URL` para que la página pueda consultar la blockchain. Y finalmente regresa a `packages/snfoundry` para compilar.
   ```bash
   cd ../snfoundry
   ```
3. **Consideraciones antes de compilar:**
   * Michipay y sus contratos incluyen pequeños ajustes en su `Scarb.toml` destinados a asegurar que el despliegue a Sepolia y la generación del ABI corran sin problemas a nivel sistema operativo.
   * Por ello, observarás que la dependencia *dev* `snforge_std` ha sido temporalmente comentada, eludiendo errores de compilación nativos de Rust. **No la descomentes** a menos que estés trabajando en flujos exclusivos de testing local con snforge.

4. **Compilación y Despliegue a la red de Sepolia:**
   Desde la misma carpeta (`packages/snfoundry`), procede a compilar los contratos y posteriormente, lánzalos a Sepolia usando la bandera apropiada.
   ```bash
   # Compila los contratos en cairo creando los artefactos correctos.
   yarn compile

   # Despliega el contrato a Sepolia indicando el parámetro de red
   yarn deploy --network sepolia
   ```
   > 💡 **Nota Técnica de Despliegue:** En ciertos entornos que utilizan Yarn como gestor de monorepositorios (workspaces restrictions), el comando de despliegue puede fallar silenciosamente o rehusarse a pasar las variables correctas. Si `yarn deploy --network sepolia` no te funciona correctamente, ejecuta el *script* compilador de manera explícita con `ts-node`:  
   > `npx ts-node scripts-ts/helpers/deploy-wrapper.ts --network sepolia`

5. **Inicia el Frontend en Next.js:**
   Una vez que el contrato en Cairo fue exitosamente desplegado y está disponible a través de tu RPC en Sepolia (tarda unos segundos), dirígete hacia la **carpeta raíz** (`michipay`) para arrancar el servidor web utilizando los comandos integrados:
   ```bash
   cd ../..
   yarn start
   ```
6. **¡Explora Michipay!**
   Abre en tu navegador `http://localhost:3000` para interactuar con la dApp. Asegúrate de que la wallet en tu explorador esté apuntando a Sepolia de la misma forma, para que logres la interacción completa.

## 🔗 Enlaces Útiles y Recursos

### 💰 Faucets (Fondos de Prueba)
Para interactuar con la red Sepolia, necesitarás ETH o STRK de prueba. Puedes obtenerlos aquí:
* [Starknet Faucet (Oficial)](https://faucet.starknet.io/)

### 👛 Wallets Compatibles
* [Braavos Wallet](https://braavos.app/download-braavos-wallet/)
* [Ready Wallet](https://www.ready.co/es-ar/download-ready-wallet)

### 🔍 Exploradores y Herramientas
* [Voyager (Explorador de Starknet)](https://voyager.online/)
* [Scaffold-Stark 2](https://scaffoldstark.com/)

## 🤝 Contribuciones

¡Las contribuciones siempre son bienvenidas! Si deseas aportar mejoras al código:

1. Haz un fork de este repositorio.
2. Crea tu de trabajo (`git checkout -b feature/CaracteristicaIncreible`).
3. Comitea tus cambios (`git commit -m 'Añade una CaracteristicaIncreible'`).
4. Sube las ramas (`git push origin feature/CaracteristicaIncreible`).
5. Abre un Pull Request describiendo tus cambios.

---
*Desarrollado con ❤️ para el ecosistema de Starknet.*
