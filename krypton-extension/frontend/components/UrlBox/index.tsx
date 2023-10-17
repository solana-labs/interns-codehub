import Paragraph from "antd/lib/typography/Paragraph";
import { Box } from "../../styles/StyledComponents.styles";

const UrlBox = ({ url }: { url: string | undefined }) => {
  return (
    <Box>
      <Paragraph copyable={{ text: `${url}`, tooltips: `Copy` }}>
        {url}
      </Paragraph>
    </Box>
  );
};

export default UrlBox;
