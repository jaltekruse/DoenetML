import React from "../../../_snowpack/pkg/react.js";
const BreadcrumbDivider = ({children, ...props}) => {
  const breadcrumbDividerStyle = {
    color: "#8a8a8a",
    margin: "auto 6px",
    userSelect: "none",
    fontSize: "20px"
  };
  return /* @__PURE__ */ React.createElement("li", {
    style: breadcrumbDividerStyle,
    ...props
  }, children);
};
export default BreadcrumbDivider;
