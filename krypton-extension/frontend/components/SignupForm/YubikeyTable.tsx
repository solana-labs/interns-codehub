import { useGlobalState } from "../../context";
import { Table } from "antd";
import bs58 from "bs58";
import { displayAddress } from "../../utils";

const YubikeyTable = () => {
  const { yubikeyInfo: info } = useGlobalState();

  if (!info) {
    return null;
  }

  const infoTable = [
    {
      key: "1",
      name: "Manufacturer",
      value: info.manufacturer,
    },
    {
      key: "2",
      name: "Serial",
      value: info.serialNumber,
    },
    {
      key: "3",
      name: "Signing Algorithm",
      value: info.signingAlgo,
    },
    {
      key: "4",
      name: "Public Key",
      value: displayAddress(bs58.encode(info.pubkeyBytes)),
    },
  ];
  const render = (text: string) => {
    return {
      props: {
        style: { background: "#222", color: "#fff" },
      },
      children: <div>{text}</div>,
    };
  };
  const columns = [
    {
      title: "Key",
      dataIndex: "name",
      key: "name",
      render,
    },
    {
      title: "Value",
      dataIndex: "value",
      key: "value",
      render,
    },
  ];

  return (
    <Table
      dataSource={infoTable}
      columns={columns}
      pagination={false}
      showHeader={false}
      bordered={false}
      size="small"
      style={{ borderColor: "#aaa" }}
    />
  );
};

export default YubikeyTable;
