import React from "react";
import Paragraph from "antd/lib/typography/Paragraph";
import { Box } from "../../styles/StyledComponents.styles";
import { EnterOutlined } from "@ant-design/icons";

const EditableBox = ({
  fieldName,
  value,
  handleChange,
}: {
  fieldName: string;
  value: string;
  handleChange: (s: string) => void;
}) => {
  return (
    <Box style={{ display: "flex" }}>
      <Paragraph>{fieldName}</Paragraph>
      <Paragraph
        style={{ position: "absolute", right: "55px" }}
        editable={{
          onChange: handleChange,
          autoSize: true,
          enterIcon: <EnterOutlined style={{ color: "#fff" }} />,
        }}
      >
        {value}
      </Paragraph>
    </Box>
  );
};

export default EditableBox;
