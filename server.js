import "dotenv/config";
import express from "express";
import app from "./api/index.js";

const PORT = process.env.PORT || 3000;

app.use(express.static("dist"));
app.get("*", (_, res) => res.sendFile("index.html", { root: "dist" }));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🧾 Compras Kuali rodando em http://localhost:${PORT}`);
});
