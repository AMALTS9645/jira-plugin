import React from "react";
import "./graphloader.css";

const GraphLoader = () => {
  return (
    <div className="in-and-out-container">
      <div className="in-and-out">
        {/* First animated group */}
        <div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>

        {/* Second animated group */}
        <div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
      </div>
    </div>
  );
};

export default GraphLoader;
