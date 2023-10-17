import { Divider } from "antd";
import { Box } from "../../styles/StyledComponents.styles";
import Paragraph from "antd/lib/typography/Paragraph";

const CopyableBox = ({
  fieldName,
  value,
  copyableValue,
}: {
  fieldName: string;
  value: string;
  copyableValue: string;
}) => {
  return (
    <Box style={{ display: "flex" }}>
      <Paragraph>{fieldName}</Paragraph>
      <Divider type="vertical" />
      <Paragraph
        style={{ position: "absolute", right: "55px" }}
        copyable={{ text: copyableValue, tooltips: `Copy` }}
      >
        {value}
      </Paragraph>
    </Box>
  );
};

export default CopyableBox;
