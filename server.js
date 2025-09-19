import dotenv from "dotenv";
import app from "./src/app.js";
dotenv.config();

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log("Server listening on", port);
});
