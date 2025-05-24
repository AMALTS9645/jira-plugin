import React, { useEffect, useState } from "react";
import { invoke } from "@forge/bridge";
import Graphrag from "./CustomGraphRag/Graphrag";

function App() {
  const [data, setData] = useState(null);

  // useEffect(() => {
  //     invoke('getText', { example: 'my-invoke-variable' }).then(setData);
  // }, []);

  return (
    <div>
      <Graphrag />
    </div>
  );
}

export default App;
