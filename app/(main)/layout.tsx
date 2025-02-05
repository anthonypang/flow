import React from "react";
const layout = ({ children }: { children: React.ReactNode }) => {
  return <div className="container mx-auto my-32">{children}</div>;
};

export default layout;
