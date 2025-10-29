// src/socket/chatSocket.js
import { Server } from "socket.io";
import Chat from "../models/Chat.js";
import Message from "../models/Message.js";

export const initChatSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("⚡ Client connected:", socket.id);

    // Tham gia room (VD: "ptId-studentId")
    socket.on("joinRoom", (roomId) => {
      if (!roomId) return;
      socket.join(roomId);
      console.log(`✅ ${socket.id} joined room ${roomId}`);
    });

    socket.on("leaveRoom", (roomId) => {
      if (!roomId) return;
      socket.leave(roomId);
      console.log(`🚪 ${socket.id} left room ${roomId}`);
    });

    // Gửi tin nhắn realtime + lưu DB
    socket.on("sendMessage", async (message) => {
      try {
        const { room, sender, text, attachments = [] } = message;
        if (!room || !sender || !text) {
          console.warn("⚠️ Missing message data:", message);
          return;
        }

        const [id1, id2] = room.split("-");
        let chatDoc = await Chat.findOne({ participants: { $all: [id1, id2] } });
        if (!chatDoc) chatDoc = await Chat.create({ participants: [id1, id2] });

        // Tạo tin nhắn mới
        const newMsg = await Message.create({
          chat: chatDoc._id,
          sender,
          text,
          attachments,
        });

        // Cập nhật lastMessage của cuộc trò chuyện
        chatDoc.lastMessage = { sender, text, timestamp: new Date() };
        await chatDoc.save();

        // Populate để trả về đầy đủ cho client
        const populatedMsg = await newMsg.populate("sender", "fullName avatar role");

        // Chuẩn payload để frontend nhận
        const payload = {
          ...populatedMsg.toObject(),
          room,
        };

        // Gửi đến tất cả trong room (bao gồm người gửi)
        io.to(room).emit("receiveMessage", payload);
        console.log("💬 Message sent + saved:", room);
      } catch (err) {
        console.error("❌ Socket sendMessage error:", err);
      }
    });

    // Đang gõ
    socket.on("typing", (roomId) => {
      if (!roomId) return;
      socket.to(roomId).emit("userTyping", { roomId });
    });

    // Dừng gõ
    socket.on("stopTyping", (roomId) => {
      if (!roomId) return;
      socket.to(roomId).emit("userStopTyping", { roomId });
    });

    // Đánh dấu đã đọc
    socket.on("markAsRead", ({ roomId, userId }) => {
      if (!roomId) return;
      io.to(roomId).emit("messagesRead", { roomId, userId });
    });

    socket.on("disconnect", () => {
      console.log("❌ Client disconnected:", socket.id);
    });
  });
};
