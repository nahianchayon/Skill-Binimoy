import { initializeAppCheck, ReCaptchaV3Provider, type AppCheck } from "firebase/app-check";
import { getApps } from "firebase/app";

let appCheck: AppCheck | undefined;
if (
  typeof window !== "undefined" &&
  getApps().length > 0 &&
  import.meta.env["VITE_FIREBASE_APPCHECK_SITE_KEY"]
) {
  appCheck = initializeAppCheck(getApps()[0], {
    provider: new ReCaptchaV3Provider(import.meta.env["VITE_FIREBASE_APPCHECK_SITE_KEY"]),
    isTokenAutoRefreshEnabled: true,
  });
}
export { appCheck };
