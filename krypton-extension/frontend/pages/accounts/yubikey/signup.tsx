import { NextPage } from "next";
import { withRouter } from "next/router";
import { useGlobalState } from "../../../context";
import { YubikeyAccount, YubikeySigner } from "../../../types/account";
import { useGlobalModalContext } from "../../../components/GlobalModal";
import PinentryModal from "../../../components/GlobalModal/PinentryModal";
import TouchConfirmModal from "../../../components/GlobalModal/TouchConfirmModal";
import YubikeyTable from "../../../components/SignupForm/YubikeyTable";
import SignupForm from "../../../components/SignupForm";
import { KeyOutlined } from "@ant-design/icons";

const YubikeySignup: NextPage = () => {
  const { yubikeyInfo: info } = useGlobalState();
  const { showModal, hideModal } = useGlobalModalContext();

  if (!info) {
    return null;
  }

  const feePayer = new YubikeySigner(
    info.aid,
    (isRetry: boolean) => {
      const promise = new Promise<string>((resolve, reject) => {
        showModal(
          <PinentryModal
            title={`Please unlock YubiKey no. ${(info.aid as string).substring(
              20,
              28
            )}`}
            isRetry={isRetry}
            onSubmitPin={(pin: string) => {
              hideModal();
              resolve(pin);
            }}
            onCancel={() => {
              hideModal();
              reject("User cancelled");
            }}
          ></PinentryModal>
        );
      });
      return promise;
    },
    () => {
      showModal(
        <TouchConfirmModal
          onCancel={() => {
            hideModal();
            console.log("User cancelled touch");
          }}
        ></TouchConfirmModal>
      );
    },
    hideModal
  );

  const handleStorage = (
    feePayerAccount: Omit<YubikeyAccount, "name" | "manufacturer">
  ) => {
    chrome.storage.local.get(["y_counter", "y_accounts"], (res) => {
      const count = res["y_counter"];
      const accountRes = res["y_accounts"];
      if (accountRes != null) {
        const old = JSON.parse(accountRes);
        const account = {
          name: "Yubikey " + count.toString(),
          manufacturer: info.manufacturer,
          ...feePayerAccount,
        } as YubikeyAccount;
        old[count] = account;
        const values = JSON.stringify(old);
        chrome.storage.local.set({
          y_accounts: values,
          y_counter: count + 1,
          y_id: count,
          pk: feePayerAccount.pk,
          mode: 1,
        });
      } else {
        return false;
      }
    });
  };

  return (
    <>
      <SignupForm feePayer={feePayer} handleStorage={handleStorage}>
        <h1 className={"title"}>
          {`Initialize YubiKey Wallet `}
          <span>
            <KeyOutlined style={{ color: "#fff" }} />
          </span>
        </h1>
        <YubikeyTable />
      </SignupForm>
    </>
  );
};

export default withRouter(YubikeySignup);
