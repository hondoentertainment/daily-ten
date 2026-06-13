import { boot } from "./app/boot";

void boot();

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(
    () => {},
  );
}
