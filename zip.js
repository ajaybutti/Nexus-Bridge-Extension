import { zip } from "zip-a-folder";
import pkg from "./package.json" with { type: "json" };
import {mkdirSync, existsSync} from 'fs';
import dayjs from "dayjs";

if (!existsSync("build")) {
    mkdirSync("build", { recursive: true });
}

const extensionFile = `build/Nexus-Injection-${
  pkg.version
}-${dayjs().format('DD-MM-YYYY-HH-mm')}.zip`;

await zip("dist", extensionFile);
