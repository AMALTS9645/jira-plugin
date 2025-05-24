import React, { useEffect, useRef, useState } from "react";
import { getData } from "./APIs/RagApi";
import "./graphrag.css";
import { invoke } from "@forge/bridge";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import KeyboardBackspaceIcon from "@mui/icons-material/KeyboardBackspace";
import SearchIcon from "@mui/icons-material/Search";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import InsightsIcon from "@mui/icons-material/Insights";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import MicIcon from "@mui/icons-material/Mic"; // Added for voice recording
import MicOffIcon from "@mui/icons-material/MicOff"; // Added for voice recording
import FullScreenDialog from "./GraphFullScreenDialog";
import GraphLoader from "./GraphLoader/GraphLoader";
import Flippers from "./GraphLoader/Flippers";
import Markdown from "react-markdown";
import { Link } from "react-router-dom";
import KeyboardIcon from "@mui/icons-material/Keyboard";
import axios from "axios";
import BugReportOutlinedIcon from "@mui/icons-material/BugReportOutlined";
import PendingActionsOutlinedIcon from "@mui/icons-material/PendingActionsOutlined";

const Graphrag = () => {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState({});
  const [chatHistory, setChatHistory] = useState([]);
  const historyContainerRef = useRef(null);
  const [graphData, setGraphData] = useState({});
  const inputRef = useRef(null);
  const [expandedIncidentIndex, setExpandedIncidentIndex] = useState(null);

  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [recordingError, setRecordingError] = useState(null);

  // Audio context and related refs
  const audioContextRef = useRef(null);
  const micStreamRef = useRef(null);
  const processorRef = useRef(null);
  const audioBufferRef = useRef([]);

  const toggleIncidentDetails = (index) => {
    if (expandedIncidentIndex === index) {
      setExpandedIncidentIndex(null);
    } else {
      setExpandedIncidentIndex(index);
    }
  };

  const handleClick = () => {
    if (message.trim() === "") {
      return;
    }
    setChatHistory((prevHistory) => [
      ...prevHistory,
      { message: message, response: {} }, // Temporary response
    ]);
    setMessage(""); // Clear the input field
    setLoading(true);
    const data = {
      question: message,
    };
    getData(data)
      .then((responseData) => {
        console.log(responseData);
        // Update chat history with the new message and response
        setChatHistory((prevHistory) => {
          const updatedHistory = [...prevHistory];
          updatedHistory[updatedHistory.length - 1].response = responseData;
          return updatedHistory;
        });
        setResponse(responseData);
        console.log(responseData);
      })
      .catch((error) => {
        console.error("Error during data ingestion:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleClick();
    }
  };

  useEffect(() => {
    if (historyContainerRef.current) {
      historyContainerRef.current.scrollTop =
        historyContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // Initialize audio context
  const initAudioContext = () => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContextRef.current = new AudioContext({ sampleRate: 16000 });
  };

  // Start recording function
  const startRecording = async () => {
    try {
      setRecordingError(null);

      if (!audioContextRef.current) {
        initAudioContext();
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          sampleSize: 16,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      micStreamRef.current = stream;
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const processor = audioContextRef.current.createScriptProcessor(
        4096,
        1,
        1
      );
      processorRef.current = processor;

      audioBufferRef.current = [];

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        if (inputData.some((sample) => sample !== 0)) {
          // Ignore silent audio
          const audioData = new Float32Array(inputData);
          audioBufferRef.current.push(audioData);
        }
      };

      source.connect(processor);
      processor.connect(audioContextRef.current.destination);

      setIsRecording(true);
    } catch (err) {
      setRecordingError("Error accessing microphone: " + err.message);
      console.error("Error accessing microphone:", err);
    }
  };

  // Stop recording function
  const stopRecording = async () => {
    if (!isRecording) return;

    setIsRecording(false);
    setIsProcessingAudio(true);

    try {
      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
      }

      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
        micStreamRef.current = null;
      }

      if (audioBufferRef.current.length === 0) {
        setRecordingError("No audio recorded. Please speak louder.");
        setIsProcessingAudio(false);
        return;
      }

      await processAudioData();
    } catch (err) {
      setRecordingError("Error processing audio: " + err.message);
      console.error("Error processing audio:", err);
    } finally {
      setIsProcessingAudio(false);
    }
  };

  // Process audio data function
  const processAudioData = async () => {
    try {
      let totalLength = audioBufferRef.current.reduce(
        (sum, buffer) => sum + buffer.length,
        0
      );
      const combinedBuffer = new Float32Array(totalLength);
      let offset = 0;

      audioBufferRef.current.forEach((buffer) => {
        combinedBuffer.set(buffer, offset);
        offset += buffer.length;
      });

      const int16Data = new Int16Array(combinedBuffer.length);
      for (let i = 0; i < combinedBuffer.length; i++) {
        const s = Math.max(-1, Math.min(1, combinedBuffer[i]));
        int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }

      const wavBuffer = createWavFile(int16Data);
      const wavBlob = new Blob([wavBuffer], { type: "audio/wav" });

      await sendAudioToServer(wavBlob);
    } catch (err) {
      setRecordingError("Error processing audio data: " + err.message);
      console.error("Error processing audio data:", err);
    }
  };

  // Create WAV file function
  const createWavFile = (int16Data) => {
    const buffer = new ArrayBuffer(44 + int16Data.length * 2);
    const view = new DataView(buffer);
    const sampleRate = 16000;
    const numChannels = 1;

    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, buffer.byteLength - 8, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, int16Data.length * 2, true);

    for (let i = 0; i < int16Data.length; i++) {
      view.setInt16(44 + i * 2, int16Data[i], true);
    }

    return buffer;
  };

  const sendAudioToServer = async (wavBlob) => {
    try {
      // Convert Blob to Base64
      const base64Data = await blobToBase64(wavBlob);

      // Call the resolver function with the audio data
      const response = await invoke("getAudioData", {
        audioData: base64Data,
        fileName: "recording.wav",
        mimeType: "audio/wav",
      });

      // Handle the response
      if (response && response.text) {
        setMessage(response.text);
        if (inputRef.current) {
          inputRef.current.focus();
        }
      } else {
        setRecordingError(response.error || "Failed to transcribe audio.");
      }
    } catch (err) {
      console.error("Error sending audio:", err);
      setRecordingError("Error sending audio to server.");
    }
  };

  // Helper function to convert Blob to Base64
  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = reader.result.split(",")[1]; // Remove MIME type prefix
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Function to render structured response
  const renderStructuredResponse = (structuredData) => {
    if (
      !structuredData ||
      !Array.isArray(structuredData) ||
      structuredData.length === 0
    ) {
      return null;
    }

    return (
      <Box mt={3} pt={2} borderTop="1px solid #e0e0e0">
        <Typography
          variant="subtitle1"
          sx={{
            mb: 2,
            fontWeight: 600,
            color: "#1976d2",
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <InsightsIcon /> Detailed Information
        </Typography>

        <Paper elevation={1} sx={{ borderRadius: 2, overflow: "hidden" }}>
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: "#f5f8fa" }}>
                  <TableCell sx={{ fontWeight: 600 }}>Report #</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Issue</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {structuredData.map((item, index) => (
                  <React.Fragment key={index}>
                    <TableRow
                      sx={{
                        "&:hover": { backgroundColor: "#f5f8fa" },
                        borderBottom:
                          expandedIncidentIndex === index ? "none" : "inherit",
                      }}
                    >
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{item.Reported_Date}</TableCell>
                      <TableCell
                        sx={{
                          maxWidth: "300px",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {item.Reported_Issue}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={item.Status_Provided}
                          size="small"
                          color={
                            item.Status_Provided?.toLowerCase() === "resolved"
                              ? "success"
                              : item.Status_Provided?.toLowerCase() ===
                                "in progress"
                              ? "warning"
                              : "default"
                          }
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={item.category}
                          size="small"
                          color="info"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => toggleIncidentDetails(index)}
                          endIcon={
                            expandedIncidentIndex === index ? (
                              <ExpandLessIcon />
                            ) : (
                              <ExpandMoreIcon />
                            )
                          }
                        >
                          {expandedIncidentIndex === index ? "Hide" : "View"}
                        </Button>
                      </TableCell>
                    </TableRow>

                    {expandedIncidentIndex === index && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          sx={{ py: 2, px: 3, backgroundColor: "#f9f9f9" }}
                        >
                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                              <Box mb={1}>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  fontWeight={600}
                                >
                                  Issue
                                </Typography>
                                <Typography variant="body2">
                                  {item.Reported_Issue}
                                </Typography>
                              </Box>
                              <Box mb={1}>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  fontWeight={600}
                                >
                                  Action Taken
                                </Typography>
                                <Typography variant="body2">
                                  {item.Action_Taken}
                                </Typography>
                              </Box>
                              <Box mb={1}>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  fontWeight={600}
                                >
                                  Root Cause
                                </Typography>
                                <Typography variant="body2">
                                  {item.RCA_Provided}
                                </Typography>
                              </Box>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <Box mb={1}>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  fontWeight={600}
                                >
                                  IT Department
                                </Typography>
                                <Typography variant="body2">
                                  {item.It_Department_Provided}
                                </Typography>
                              </Box>
                              <Box mb={1}>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  fontWeight={600}
                                >
                                  Process
                                </Typography>
                                <Typography variant="body2">
                                  {item.Process_Provided}
                                </Typography>
                              </Box>
                              <Box mb={1}>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  fontWeight={600}
                                >
                                  Status
                                </Typography>
                                <Typography variant="body2">
                                  {item.Status_Provided}
                                </Typography>
                              </Box>
                            </Grid>
                          </Grid>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      </Box>
    );
  };

  return (
    <div>
      <Container maxWidth="xl" sx={{ pb: 8 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Typography variant="subtitle1" color="text.secondary">
            Intelligent Graph-Driven Insights for Application Management
          </Typography>

          <Paper
            elevation={0}
            sx={{
              p: 2,
              display: "flex",
              alignItems: "center",
              gap: 2,
              bgcolor: "#f5f8fa",
              borderRadius: 2,
              border: "1px solid #e0e6ed",
            }}
          >
            <KeyboardIcon
              sx={{ width: 40, height: 40, bgcolor: "primary.light" }}
            />
            <Typography
              variant="body2"
              sx={{ fontWeight: 500, color: "#344767" }}
            >
              A comprehensive Retrieval-Augmented Generation (RAG) system
              designed to provide intelligent, graph-driven insights and
              solutions for effective Application Management Services, enhancing
              support efficiency and decision-making.
            </Typography>
          </Paper>

          <Divider />

          <Grid container spacing={3}>
            <Grid item xs={12} md={10}>
              <Paper
                elevation={2}
                sx={{
                  borderRadius: 3,
                  overflow: "hidden",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Box
                  ref={historyContainerRef}
                  sx={{
                    p: 3,
                    flexGrow: 1,
                    overflowY: "auto",
                    maxHeight: "60vh",
                    minHeight: "60vh",
                    bgcolor: "#fafafa",
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                  className="historyContainer"
                >
                  {chatHistory.length === 0 && (
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "100%",
                        color: "text.secondary",
                        gap: 2,
                      }}
                    >
                      <InsightsIcon
                        sx={{ fontSize: 60, color: "primary.light" }}
                      />
                      <Typography variant="h6">
                        Ask anything about your application tickets
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ maxWidth: "600px", textAlign: "center" }}
                      >
                        Try asking about recent issues, trends in ticket
                        categories, or specific application problems.
                      </Typography>
                    </Box>
                  )}

                  {chatHistory.map((chat, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "flex-end",
                        }}
                      >
                        <Paper
                          elevation={1}
                          sx={{
                            p: 2,
                            borderRadius: "18px 18px 3px 18px",
                            bgcolor: "primary.light",
                            color: "primary.contrastText",
                            maxWidth: "75%",
                          }}
                        >
                          <Typography variant="body1">
                            {chat.message}
                          </Typography>
                        </Paper>
                      </Box>

                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "flex-start",
                        }}
                      >
                        <Paper
                          elevation={1}
                          sx={{
                            p: 2,
                            borderRadius: "18px 18px 18px 3px",
                            bgcolor: "white",
                            width: "100%",
                          }}
                        >
                          {chat.response?.result ? (
                            <>
                              <Box sx={{ "& p": { my: 1 } }}>
                                {chat.response.result
                                  .split("\n")
                                  .map((line, i) => (
                                    <Markdown key={i}>{line}</Markdown>
                                  ))}

                                <Box sx={{ "& p": { my: 1 }, mb: 1 }}>
                                  <Typography
                                    variant="subtitle1"
                                    sx={{
                                      fontWeight: 600,

                                      color: "#1976d2",

                                      display: "flex",

                                      alignItems: "center",

                                      gap: 1,

                                      fontSize: "16px",
                                    }}
                                  >
                                    <BugReportOutlinedIcon /> Root Cause
                                    Evaluation
                                  </Typography>

                                  <Typography variant="caption">
                                    {
                                      chat?.response?.overall_analysis
                                        ?.Overall_Root_Cause
                                    }
                                  </Typography>
                                </Box>

                                <Box sx={{ "& p": { my: 1 } }}>
                                  <Typography
                                    variant="subtitle1"
                                    sx={{
                                      fontWeight: 600,
                                      color: "#1976d2",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 1,
                                      fontSize: "16px",
                                    }}
                                  >
                                    <PendingActionsOutlinedIcon /> Corrective &
                                    Preventive Actions
                                  </Typography>

                                  <Typography variant="caption">
                                    {
                                      chat?.response?.overall_analysis
                                        ?.Overall_Action_Taken
                                    }
                                  </Typography>
                                </Box>
                              </Box>
                              {renderStructuredResponse(
                                chat.response.structured_response
                              )}
                            </>
                          ) : (
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "center",
                                py: 2,
                              }}
                            >
                              <Flippers />
                            </Box>
                          )}
                        </Paper>
                      </Box>
                    </Box>
                  ))}
                </Box>

                <Box
                  sx={{
                    p: 2,
                    borderTop: "1px solid #e0e0e0",
                    bgcolor: "white",
                  }}
                >
                  {recordingError && (
                    <Typography
                      color="error"
                      variant="caption"
                      sx={{ display: "block", mb: 1 }}
                    >
                      {recordingError}
                    </Typography>
                  )}

                  <TextField
                    inputRef={inputRef}
                    fullWidth
                    variant="outlined"
                    placeholder="Ask about ticket details, issues, or trends..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon color="primary" />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <Tooltip
                            title={
                              isRecording
                                ? "Stop recording"
                                : "Start voice input"
                            }
                          >
                            <IconButton
                              onClick={
                                isRecording ? stopRecording : startRecording
                              }
                              disabled={isProcessingAudio}
                              color={isRecording ? "error" : "primary"}
                              sx={{ mr: 1 }}
                            >
                              {isRecording ? <MicOffIcon /> : <MicIcon />}
                            </IconButton>
                          </Tooltip>
                          <Button
                            variant="contained"
                            disableElevation
                            onClick={handleClick}
                            disabled={loading || message.trim() === ""}
                            sx={{
                              borderRadius: 2,
                              px: 3,
                            }}
                            endIcon={
                              loading ? (
                                <CircularProgress size={20} color="inherit" />
                              ) : (
                                <SendIcon />
                              )
                            }
                          >
                            Send
                          </Button>
                        </InputAdornment>
                      ),
                      sx: {
                        borderRadius: 2,
                        pr: 1,
                        "& fieldset": { borderColor: "transparent" },
                        "&:hover fieldset": { borderColor: "primary.light" },
                      },
                    }}
                    sx={{ bgcolor: "#f5f8fa" }}
                  />
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} md={2}>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                  height: "100%",
                }}
              >
                {response?.graph_data ? (
                  <Paper
                    elevation={2}
                    sx={{
                      borderRadius: 3,
                      overflow: "hidden",
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <Box
                      sx={{
                        p: 2,
                        borderBottom: "1px solid #e0e0e0",
                        bgcolor: "#f5f8fa",
                      }}
                    >
                      <Typography variant="h6" fontWeight={600}>
                        Graph Visualization
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Explore the relationships between tickets and issues
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        p: 3,
                        flexGrow: 1,
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <FullScreenDialog
                        graphData={response?.graph_data}
                        name="Explore Graph"
                      />
                    </Box>
                  </Paper>
                ) : (
                  <Paper
                    elevation={2}
                    sx={{
                      borderRadius: 3,
                      p: 3,
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: 2,
                      bgcolor: "#f5f8fa",
                    }}
                  >
                    <Box sx={{ color: "text.secondary", textAlign: "center" }}>
                      <InsightsIcon
                        sx={{ fontSize: 60, color: "primary.light", mb: 2 }}
                      />
                      <Typography variant="h6" gutterBottom>
                        No Graph Available
                      </Typography>
                      <Typography variant="body2">
                        Ask a question about your application tickets to
                        generate a related graph visualization
                      </Typography>
                    </Box>
                  </Paper>
                )}
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Container>
    </div>
  );
};

export default Graphrag;
