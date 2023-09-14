import initApp from "./app";

async function initServer() {
  const app = await initApp();
  const PORT = Number(process.env.PORT) || 8000;

  app.listen(PORT, () => console.log(`Server started at: ${PORT}`));
}

initServer();
