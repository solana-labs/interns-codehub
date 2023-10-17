import { Modal } from "antd";
import { LoadingOutlined } from "@ant-design/icons";

const TouchConfirmModal = (props: { onCancel: () => void }) => {
  return (
    <Modal
      open={true}
      closable={false}
      title="Touch your YubiKey to confirm..."
      footer={null}
    >
      <LoadingOutlined
        style={{
          fontSize: "50px",
          color: "#fff",
          display: "block",
          marginLeft: "auto",
          marginRight: "auto",
        }}
        spin
      />
    </Modal>
  );
};

export default TouchConfirmModal;
