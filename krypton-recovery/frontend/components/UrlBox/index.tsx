import React, { ReactElement } from "react";
import { Typography } from "antd";
import { Box } from "../../styles/StyledComponents.styles";

const { Paragraph } = Typography;


const UrlBox = ({ url }: { url: string | undefined }): ReactElement => {
  return (
    <Box>
      <Paragraph copyable={{ text: `${url}`, tooltips: `Copy` }}>
        {url}
      </Paragraph>
    </Box>
  );
};

export default UrlBox;
