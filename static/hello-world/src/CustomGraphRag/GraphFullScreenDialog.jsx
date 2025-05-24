import * as React from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import ListItemText from "@mui/material/ListItemText";
import ListItemButton from "@mui/material/ListItemButton";
import List from "@mui/material/List";
import Divider from "@mui/material/Divider";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import CloseIcon from "@mui/icons-material/Close";
import Slide from "@mui/material/Slide";
import GraphComponent from "./GraphComponent";
import GraphLoader from "./GraphLoader/GraphLoader";
import BubbleChartIcon from "@mui/icons-material/BubbleChart";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default function FullScreenDialog({ graphData, name }) {
  const [open, setOpen] = React.useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <React.Fragment>
      <Button
        variant="outlined"
        onClick={handleClickOpen}
        sx={{
          color: "#47d7ffe24",
          border: "1px solid black",
          height: "100%",
          minWidth: "100px",
        }}
      >
        <BubbleChartIcon
          sx={{
            position: "relative",
            width: "100px",
            height: "100px",
            opacity: "20%",
          }}
        />
        <span style={{ position: "absolute", color: "black" }}>{name}</span>
      </Button>
      <Dialog
        fullScreen
        open={open}
        onClose={handleClose}
        TransitionComponent={Transition}
      >
        <AppBar sx={{ position: "relative", backgroundColor: "#079c9c" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              width: "100%",
            }}
          >
            <IconButton
              edge="start"
              color="inherit"
              onClick={handleClose}
              aria-label="close"
              sx={{ ml: "auto" }}
            >
              <CloseIcon />
            </IconButton>
          </div>
        </AppBar>
        <div style={{ overflowY: "auto" }}>
          {graphData?.nodes ? (
            <GraphComponent data={graphData} />
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                paddingTop: "100px",
              }}
            >
              <GraphLoader />
            </div>
          )}
        </div>
      </Dialog>
    </React.Fragment>
  );
}
