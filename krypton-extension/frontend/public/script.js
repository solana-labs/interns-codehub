import { initialize } from "krypton-wallet-standard";
import { SolanaProvider } from "./provider";

const krypton = new SolanaProvider();

initialize(krypton);

try {
  Object.defineProperty(window, "krypton", { value: krypton });
} catch (error) {
  console.error(error);
}
