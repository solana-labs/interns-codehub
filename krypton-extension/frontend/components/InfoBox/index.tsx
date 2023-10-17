import { Divider } from "antd";
import { Box } from "../../styles/StyledComponents.styles";
import Paragraph from "antd/lib/typography/Paragraph";

const InfoBox = ({
  fieldName,
  value,
}: {
  fieldName: string;
  value: string;
}) => {
  return (
    <Box style={{ display: "flex" }}>
      <Paragraph>{fieldName}</Paragraph>
      <Divider type="vertical" />
      <Paragraph style={{ position: "absolute", right: "55px" }}>
        {value}
      </Paragraph>
    </Box>
  );
};

export default InfoBox;
