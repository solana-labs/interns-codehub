import { Button, Form, Input, Modal } from "antd";
import {
  KeyOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
} from "@ant-design/icons";

const PinentryModal = (props: {
  title: string;
  isRetry: boolean;
  onSubmitPin: (pin: string) => void;
  onCancel: () => void;
}) => {
  const [form] = Form.useForm();

  return (
    <Modal
      open={true}
      closable={false}
      title={props.title}
      footer={[
        <Button key="cancel" onClick={props.onCancel}>
          Cancel
        </Button>,
      ]}
    >
      <KeyOutlined
        style={{
          fontSize: "50px",
          color: "#fff",
          display: "block",
          marginLeft: "auto",
          marginRight: "auto",
        }}
      />
      <Form
        form={form}
        layout="vertical"
        name="form_in_modal"
        preserve={false}
        onFinish={({ pin }: { pin: string }) => {
          props.onSubmitPin(pin);
        }}
      >
        <Form.Item name="pin">
          <Input.Password
            placeholder="PIN"
            type="password"
            status={props.isRetry ? "error" : ""}
            iconRender={(visible) =>
              visible ? (
                <EyeOutlined style={{ color: "#fff" }} />
              ) : (
                <EyeInvisibleOutlined style={{ color: "#fff" }} />
              )
            }
            style={{
              minWidth: "300px",
              backgroundColor: "rgb(34, 34, 34)",
              color: "#d3d3d3",
              border: "1px solid #d3d3d3",
              outlineColor: "#fff",
            }}
            autoFocus
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default PinentryModal;
