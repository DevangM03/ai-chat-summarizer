import "./App.css";
import { useState, useEffect, useRef, useCallback } from "react";
import { 
  Box,
  Button,
  Container,
  HStack,
  Input,
  VStack,
  Text,
} from "@chakra-ui/react";

import { app } from "./firebase";

// Firebase Authentication services
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "firebase/auth";

// Firebase Firestore database services
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
  getDoc,
  limit // OPTIMIZATION: Imported limit constraint to handle cost-controls at scale
} from "firebase/firestore";

import Message from "./componentsMain/Message";

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);

// Chat rooms configuration with secure passcode protection
// Each room requires a unique passcode stored in environment variables
const CHAT_ROOMS = [
  { id: "general", name: "General Chat", passcode: process.env.REACT_APP_CHAT_PASSCODE_1},
  { id: "tech", name: "Tech Talk", passcode: process.env.REACT_APP_CHAT_PASSCODE_2},
  { id: "random", name: "Random Stuff", passcode: process.env.REACT_APP_CHAT_PASSCODE_3},
];

function App() {
  // Authentication and user state
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  
  // Chat functionality state
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [roomPasscodes, setRoomPasscodes] = useState({});
  
  // AI summarization state (Switched to high-speed Groq integration cloud pipeline)
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summary, setSummary] = useState(null);
  const [groqApiKey] = useState(process.env.REACT_APP_GROQ_API_KEY);
  
  // UI state management
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  
  // Refs for DOM manipulation
  const messagesEndRef = useRef(null);

  // Automatically scrolls to the bottom of the message container
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Auto-scroll when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Authentication state listener
  // Monitors user login/logout state and fetches user profile data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Fetch user profile from Firestore
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          const userData = userDoc.data();
          
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            nickname: userData?.nickname || firebaseUser.email.split('@')[0],
          });
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        // Reset state on logout
        setUser(null);
        setMessages([]);
        setCurrentRoom(null);
      }
    });
    
    return unsubscribe;
  }, []);

  // Real-time message loader for current chat room
  // OPTIMIZED: Implements a query cursor limit and reversed sorting to enforce predictable cost structures
  const loadMessages = useCallback(() => {
    if (!currentRoom) return;
    
    const q = query(
      collection(db, "rooms", currentRoom.id, "messages"), 
      orderBy("timestamp", "desc"), // Fetch the most recent items first to support pagination bounds
      limit(50)                    // Strict guardrail to optimize read latency and prevent unbounded database charges
    );
    
    return onSnapshot(q, (querySnapshot) => {
      const msgs = [];
      querySnapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() });
      });
      // Invert the array order in client-side local memory to preserve correct historical flow in the chat UI
      setMessages(msgs.reverse());
    }, (error) => {
      console.error("Error loading optimized message stream:", error);
      showNotification("Failed to load real-time message stream", "error");
    });
  }, [currentRoom]);

  // Effect to manage message subscription lifecycle
  // Subscribes to messages when user joins a room, unsubscribes on leave
  useEffect(() => {
    let unsubscribe = () => {};
    if (user && currentRoom) {
      unsubscribe = loadMessages();
    }
    return () => unsubscribe();
  }, [user, currentRoom, loadMessages]);

  // Displays temporary notification messages to users
  const showNotification = (message, type = "info") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 1000);
  };

  // Handles user authentication (login/registration)
  // Includes secret key validation for new user registration
  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (isLogin) {
        // User login
        await signInWithEmailAndPassword(auth, email, password);
        showNotification("Login successful", "success");
      } else {
        // New user registration with secret key validation
        if (secretKey !== process.env.REACT_APP_SECRET_KEY) {
          throw new Error("Invalid secret key");
        }
        
        const userCredential = await createUserWithEmailAndPassword(
          auth, 
          email, 
          password
        );
        
        // Store user profile in Firestore
        await setDoc(doc(db, "users", userCredential.user.uid), {
          nickname,
          email,
        });
        
        showNotification("Account created successfully", "success");

        // empty all fields after login or signup
        setEmail("");
        setPassword("");
        setNickname("");
        setSecretKey("");
      }
    } catch (error) {
      console.error("Authentication error:", error);
      showNotification(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Handles user logout and state cleanup
  const logoutHandler = async () => {
    try {
      await signOut(auth);
      showNotification("Logged out successfully", "info");
      setCurrentRoom(null);
    } catch (error) {
      console.error("Logout error:", error);
      showNotification(error.message, "error");
    }
  };

  // Validates passcode and joins specified chat room
  const joinRoom = (room) => {
    const enteredPasscode = roomPasscodes[room.id] || "";
    
    if (enteredPasscode === room.passcode) {
      setCurrentRoom(room);
      // Clear passcode after successful join
      setRoomPasscodes(prev => ({ ...prev, [room.id]: "" }));
      showNotification(`Successfully joined ${room.name}`, "success");
    } else {
      showNotification("Incorrect passcode. Please try again.", "error");
    }
  };

  // Leaves current chat room and cleans up related state
  const leaveRoom = () => {
    setCurrentRoom(null);
    setMessages([]);
    setSummary(null);
    showNotification("Left the chat room", "info");
  };

  // Handles message submission to current chat room
  // Stores message with user metadata and server timestamp
  const submitHandler = async (e) => {
    e.preventDefault();
    
    // Validate input and user state
    if (!message.trim() || !user || !currentRoom) return;

    try {
      await addDoc(collection(db, "rooms", currentRoom.id, "messages"), {
        text: message,
        uid: user.uid,
        email: user.email,
        nickname: user.nickname,
        timestamp: serverTimestamp(),
      });
      
      // Clear input after successful send
      setMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      showNotification("Failed to send message. Please try again.", "error");
    }
  };

  // Generates AI-powered conversation summary using Groq & Llama 3
  // ADVANCED INTEGRATION: Enforces native structural JSON compilation objects via response schemas
  const generateSummary = async () => {
    // Validate prerequisites & error handling
    if (!messages || messages.length === 0) {
      showNotification("No messages available to summarize", "error");
      return;
    }

    if (!groqApiKey) {
      showNotification("Groq API key not configured in .env", "error");
      return;
    }

    setIsGeneratingSummary(true);
    setSummary(null);

    try {
      // Format clean sequential text chunks for ingestion
      const chatHistory = messages
        .filter(msg => msg.text && msg.nickname) 
        .map(msg => `${msg.nickname}: ${msg.text}`)
        .join('\n');

      if (!chatHistory.trim()) {
        showNotification("No valid conversational logs available", "error");
        return;
      }

      // Execute AI Inference Pipeline against Groq REST Engine Endpoint
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${groqApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: `You are an advanced meeting analytics pipeline. Analyze the provided text chat transcript and return a response strictly structured as a single JSON object. Do not include markdown code blocks, backticks, or wrapping formatting text. The schema must exactly match: 
              {
                "overview": "string",
                "mainTopics": ["string"],
                "sentimentAnalysis": {
                  "label": "string",
                  "score": number
                },
                "participantDynamics": [
                  {
                    "nickname": "string",
                    "interactionStyle": "string"
                  }
                ]
              }`
            },
            {
              role: "user",
              content: `Perform an advanced text-mining assessment on the following chat logs. Extract a high-level overview, primary structural themes/topics, explicit polarity sentiment indexing, and individual participant communication dynamics.\n\nTranscript:\n${chatHistory}`
            }
          ],
          response_format: { type: "json_object" }, 
          temperature: 0.2
        })
      });

      if (!response.ok) {
        throw new Error(`Groq Gateway connection exception error code: ${response.status}`);
      }

      const rawData = await response.json();
      const stringifiedJson = rawData.choices[0].message.content;
      
      // Safely parse schema-compliant object payload
      const structuredAnalytics = JSON.parse(stringifiedJson);

      // DOWNSTREAM CONSUMPTION SINK: Write the validated operational telemetry to a structured Firestore logging collection
      await addDoc(collection(db, "rooms", currentRoom.id, "analytics"), {
        overview: structuredAnalytics.overview,
        topics: structuredAnalytics.mainTopics,
        sentiment: structuredAnalytics.sentimentAnalysis,
        dynamics: structuredAnalytics.participantDynamics,
        generatedAt: serverTimestamp(),
        logSnapshotSize: messages.length
      });

      // Format the parsed structural object elements back into readable presentation data lines for the overlay UI
      const formattedPresentationText = `
1. OVERVIEW
${structuredAnalytics.overview}

2. MAIN TOPICS EXTRACTED
${structuredAnalytics.mainTopics.map(topic => `• ${topic}`).join('\n')}

3. SENTIMENT ANALYSIS
Classification: ${structuredAnalytics.sentimentAnalysis.label} (Index Score: ${structuredAnalytics.sentimentAnalysis.score})

4. PARTICIPANT BEHAVIORAL DYNAMICS
${structuredAnalytics.participantDynamics.map(p => `• ${p.nickname}: ${p.interactionStyle}`).join('\n')}
      `.trim();

      setSummary(formattedPresentationText);
      showNotification("Analytics pipeline executed and archived to DB sink", "success");

    } catch (error) {
      console.error("Error running analytical pipeline:", error);
      showNotification("Failed to execute pipeline: check terminal console logs", "error");
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // Notification component
  const Notification = () => {
    if (!notification) return null;
    
    const bgColor = {
      success: "green.500",
      error: "red.500",
      info: "blue.500",
    }[notification.type] || "blue.500";
    
    return (
      <Box
        position="fixed"
        top="20px"
        left="50%"
        transform="translateX(-50%)"
        bg={bgColor}
        color="white"
        px={4}
        py={2}
        borderRadius="md"
        zIndex="toast"
        boxShadow="md"
      >
        <Text>{notification.message}</Text>
      </Box>
    );
  };

  /**
   * Summary display overlay component
   * Shows AI-generated conversation summary with copy functionality
   */
  const SummaryDisplay = () => {
    if (!summary) return null;
    
    return (
      <Box
        position="fixed"
        top="80px"
        left="50%"
        transform="translateX(-50%)"
        bg="white"
        border="1px solid"
        borderColor="gray.300"
        borderRadius="md"
        boxShadow="lg"
        p={6}
        maxW="600px"
        maxH="400px"
        overflowY="auto"
        zIndex="modal"
        w="90%"
      >
        <VStack spacing={4} align="stretch">
          <HStack justify="space-between">
            <Text fontSize="lg" fontWeight="bold" color="black">
              Chat Summary - {currentRoom?.name}
            </Text>
            <Button
              size="sm"
              onClick={() => setSummary(null)}
              bg="gray.200"
              _hover={{ bg: "gray.300" }}
              color="black"
              aria-label="Close summary"
            >
              ✕
            </Button>
          </HStack>
          
          <Box>
            <Text whiteSpace="pre-wrap" lineHeight="tall" fontSize="sm" color="black">
              {summary}
            </Text>
          </Box>
          
          <HStack spacing={2}>
            <Button 
              size="sm"
              bg="purple.500" 
              color="white"
              _hover={{ bg: "purple.600" }}
              onClick={() => setSummary(null)}
            >
              Close
            </Button>
            <Button 
              size="sm"
              variant="outline"
              color="black"
              borderColor="gray.300"
              onClick={() => {
                navigator.clipboard.writeText(summary);
                showNotification("Summary copied to clipboard", "success");
              }}
            >
              Copy
            </Button>
          </HStack>
        </VStack>
      </Box>
    );
  };

  // Main application render
  return (
    <Box bg="red.50" minH="100vh">
      <Notification />
      <SummaryDisplay />
      
      {user ? (
        currentRoom ? (
          // Chat Room Interface
          <Container h="100vh" bg="blackAlpha.300" overflow="hidden">
            <VStack h="full" py={4} spacing={4}>
              {/* Chat Room Header */}
              <HStack w="full" justify="space-between" align="center" py={2}>
                <HStack spacing={2}>
                  <Button 
                    onClick={leaveRoom} 
                    bg="gray.500" 
                    color="white" 
                    _hover={{ bg: "green.600" }}
                    size="sm"
                  >
                    ← Back
                  </Button>
                  
                  <Button 
                    onClick={generateSummary}
                    bg="blue.500" 
                    color="white" 
                    _hover={{ bg: "blue.600" }}
                    isLoading={isGeneratingSummary}
                    loadingText="Summarizing..."
                    size="sm"
                    isDisabled={messages.length === 0}
                  >
                    📄Summary
                  </Button>
                </HStack>
                
                <Box flex="1" textAlign="center">
                  <Text fontWeight="bold" fontSize="xl" color="pink.700">
                    {currentRoom.name}
                  </Text>
                </Box>
                
                <Button 
                  onClick={logoutHandler} 
                  bg="blackAlpha.800" 
                  color="white" 
                  _hover={{ bg: "red.600" }}
                  size="sm"
                >
                  Logout ({user.nickname})
                </Button>
              </HStack>

              {/* Empty State Message */}
              {messages.length === 0 && (
                <Box 
                  bg="blue.50" 
                  border="1px solid" 
                  borderColor="blue.200" 
                  borderRadius="md" 
                  p={4}
                >
                  <Text fontSize="sm" color="blue.700" textAlign="center">
                    <Text as="span" fontWeight="bold">Welcome to {currentRoom.name}!</Text>
                    <br />
                    Start chatting to see messages here. You can generate a summary once there are messages in the chat.
                  </Text>
                </Box>
              )}

              {/* Messages Container */}
              <VStack
                h="full"
                w="full"
                overflowY="auto"
                spacing={3}
                px={2}
                css={{  
                  "&::-webkit-scrollbar": {
                    display: "none",
                  },
                }}
              >
                {messages.map((item) => (
                  <Message
                    key={item.id}
                    user={item.uid === user.uid ? "me" : "other"}
                    text={item.text}
                    timestamp={item.timestamp}
                    senderEmail={item.email}
                    senderNickname={item.nickname}
                  />
                ))}
                <div ref={messagesEndRef} />
              </VStack>
                
              {/* Message Input Form */}
              <Box as="form" onSubmit={submitHandler} w="full" px={2}>
                <HStack>
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message..."
                    bg="white"
                    color="black"
                    borderColor="gray.300"
                  />
                  <Button 
                    type="submit" 
                    bg="purple.600" 
                    color="white"
                    _hover={{ bg: "purple.500" }}
                    isLoading={loading}
                  >
                    Send
                  </Button>
                </HStack>
              </Box>
            </VStack>
          </Container>
        ) : (
          // Room Selection Interface
          <VStack bg="alphaWhite.600" justify="center" h="100vh" px={4}>
            <Box 
              w="full" 
              maxW="md" 
              bg="white" 
              p={6} 
              borderRadius="md" 
              boxShadow="md"
            >
              <VStack spacing={4}>
                <Text fontSize="2xl" fontWeight="bold" mb={4} color="black">
                  Select a Chat Room
                </Text>
                
                {CHAT_ROOMS.map((room) => (
                  <Box 
                    key={room.id} 
                    w="full" 
                    borderWidth="2px" 
                    borderRadius="md" 
                    p={4}
                    borderColor="gray.200"
                    bg="gray.50"
                    _hover={{ bg: "whiteAlpha.600" }}
                  >
                    <VStack spacing={3}>
                      <Text fontWeight="semibold" color="black">{room.name}</Text>
                      <Input
                        type="password"
                        value={roomPasscodes[room.id] || ""}
                        onChange={(e) => setRoomPasscodes(prev => ({ 
                          ...prev,
                          [room.id]: e.target.value
                        }))}
                        placeholder="Enter passcode"
                        bg="white"
                        color="black"
                        borderColor="gray.300"
                        _focus={{
                          borderColor: "gray.500",
                          boxShadow: "none",
                        }}
                      />
                      <Button 
                        onClick={() => joinRoom(room)}
                        bg="yellow.500" 
                        color="white" 
                        w="full"
                        _hover={{ bg: "green.600" }}
                      >
                        Join Room
                      </Button>
                    </VStack>
                  </Box>
                ))}
                
                <Button 
                  onClick={logoutHandler} 
                  variant="link" 
                  color="red.500"
                >
                  Logout
                </Button>
              </VStack>
            </Box>
          </VStack>
        )
      ) : (
        // Authentication Interface
        <VStack bg="alphaWhite.600" justify="center" h="100vh" px={4}>
          <Box 
            as="form" 
            onSubmit={handleAuth} 
            w="full" 
            maxW="md" 
            bg="white" 
            p={6} 
            borderRadius="md" 
            boxShadow="md"
            _hover={{ bg: "white" }}
          >
            <VStack spacing={4}>
              <Text fontSize="2xl" fontWeight="bold" mb={4} color="black">
                {isLogin ? "Login" : "Sign Up"}
              </Text>
              
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                bg="white"
                color="black"
                borderColor="gray.300"
                _focus={{
                  borderColor: "gray.500",
                  boxShadow: "lg",
                }}
              />
              
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                minLength={6}
                bg="white"
                color="black"
                borderColor="gray.300"
                _focus={{
                  borderColor: "gray.500",
                  boxShadow: "none",
                }}
              />
              
              {/* Additional fields for registration */}
              {!isLogin && (
                <>
                  <Input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Choose a nickname"
                    required
                    bg="white"
                    color="black"
                    borderColor="gray.300"
                    _focus={{
                      borderColor: "gray.500",
                      boxShadow: "none",
                }}
                  />
                  
                  <Input
                    type="password"
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    placeholder="Secret Key"
                    required
                    bg="white"
                    color="black"
                    borderColor="gray.300"
                    _focus={{
                      borderColor: "gray.500",
                      boxShadow: "none",
                    }}
                  />
                </>
              )}
              
              <Button 
                type="submit" 
                bg="yellow.500" 
                color="white" 
                w="full"
                _hover={{ bg: "green.600" }}
                isLoading={loading}
              >
                {isLogin ? "Login" : "Sign Up"}
              </Button>
              
              <Button
                variant="link"
                onClick={() => setIsLogin(!isLogin)}
                size="sm"
                color="blue.500"
              >
                {isLogin
                  ? "Need an account? Sign Up"
                  : "Already have an account? Login"}
              </Button>
            </VStack>
          </Box>
        </VStack>
      )}
    </Box>
  );
}

export default App;