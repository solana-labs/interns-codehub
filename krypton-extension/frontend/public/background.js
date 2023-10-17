import { PublicKey } from "@solana/web3.js";
import { Buffer } from "buffer";

const responseHandlers = new Map();

const handleConnect = async (message, sender, sendResponse) => {
  chrome.storage.local.get(["pk"]).then(async (result) => {
    if (result.pk == undefined) {
      console.log("pk not found");
      return;
    }
    const pk = new PublicKey(result.pk);
    const pda = PublicKey.findProgramAddressSync(
      [Buffer.from("profile", "utf-8"), pk.toBuffer()],
      // NOTE: SWITCH programId for corresponding network
      new PublicKey("2aJqX3GKRPAsfByeMkL7y9SqAGmCQEnakbuHJBdxGaDL")
      // new PublicKey("4eHGeN4mBXdJUAbb7iF8LL5Hj75GBxskXGPLcTH2MQHc")
    );
    const callback = async (data, id) => {
      await sendResponse(data, id);
    };
    await callback({
      method: "connected",
      params: {
        publicKey: pda[0],
      },
      id: message.data.id,
    });
  });
};

const handleDisconnect = async (message, sender, sendResponse) => {
  await sendResponse({ method: "disconnected", id: message.data.id });
};

const launchPopup = async (message, sender, sendResponse) => {
  const searchParams = {};
  searchParams.origin = sender.origin;
  searchParams.request = JSON.stringify(message.data);
  if (message.data.params?.network) {
    searchParams.network = message.data.params.network;
  }

  chrome.windows.getLastFocused(async (focusedWindow) => {
    await chrome.storage.local.set({ searchParams: searchParams });
    const popup = await chrome.windows.create({
      url: "adapter/" + message.data.method + ".html",
      type: "popup",
      width: 450,
      height: 650,
      top: focusedWindow.top,
      left: focusedWindow.left + (focusedWindow.width - 450),
      focused: true,
    });

    const listener = (windowId) => {
      if (windowId === popup.id) {
        const responseHandler = responseHandlers.get(message.data.id);
        if (responseHandler) {
          responseHandlers.delete(message.data.id);
          responseHandler({
            error: "Operation cancelled",
            id: message.data.id,
          });
        }
        chrome.windows.onRemoved.removeListener(listener);
      }
    };
    chrome.windows.onRemoved.addListener(listener);
  });

  responseHandlers.set(message.data.id, sendResponse);
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) {
    return;
  }

  if (message.channel === "krypton_contentscript_background_channel") {
    if (message.data.method === "connect") {
      handleConnect(message, sender, sendResponse);
    } else if (message.data.method === "disconnect") {
      handleDisconnect(message, sender, sendResponse);
    } else {
      launchPopup(message, sender, sendResponse);
    }
    // keeps response channel open
    return true;
  } else if (message.channel === "krypton_extension_background_channel") {
    console.log("message: ", message);
    const responseHandler = responseHandlers.get(message.data.id);
    responseHandlers.delete(message.data.id);
    responseHandler(message.data, message.data.id);
  }
});
