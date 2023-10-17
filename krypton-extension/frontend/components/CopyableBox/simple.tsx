import Paragraph from "antd/lib/typography/Paragraph";

const CopyableBoxSimple = ({
  value,
  copyableValue,
}: {
  value: string;
  copyableValue: string;
}) => {
  return (
    <>
      <Paragraph
        style={{ textAlign: "center" }}
        copyable={{ text: copyableValue, tooltips: `Copy` }}
      >
        {value}
      </Paragraph>
</>
  );
};

export default CopyableBoxSimple;
