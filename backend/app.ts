import express from "express";
import cors from "cors";
import { Request, Response } from "express";
import chatRoutes from "./api/chat/api";
require("dotenv").config();


const app = express();
const port = 8080;

app.use(
  cors({
    origin: "http://localhost:3001",
  })
);

app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send("Hello World!");
});

chatRoutes(app);


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
