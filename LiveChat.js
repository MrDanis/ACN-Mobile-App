import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Linking,
  useWindowDimensions,
  Pressable,
  Platform,
  Modal,
  BackHandler,
} from 'react-native';
import MIcon from 'react-native-vector-icons/Octicons';
import DocumentPicker from 'react-native-document-picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useNavigation} from '@react-navigation/native';
import {useSelector} from 'react-redux';
import {getApi} from '../../../utils/GetApi';
import Loader from '../../glabalScreens/Loader';
import {PostApi} from '../../../utils/PostApi';
import RNFS from 'react-native-fs';
import {
  AUTHENTICATE_EVENT,
  DELETE_MESSAGE_EVENT,
  DISCONNECT_EVENT,
  INCOMING_CALL,
  JOIN_EVENT_REQUEST,
  MESSAGE_REACTION,
  NEW_MESSAGE_EVENT,
  UPDATE_INBOX_EVENT,
} from '../../../components/eventTypes';
import connectionSocket from '../../../utils/socket';
import {disconnectSocket} from '../../../utils/socket';
import {io} from 'socket.io-client';
import RenderHTML from 'react-native-render-html';
import CallModal from './CallModal';
import CommingCallModal from './CommingCallModal';
import DeleteMessageModal from './DeleteMessageModal';
import {} from '@env';
import {NEXT_PUBLIC_BUCKET_URL} from '@env';
import {useFocusEffect} from '@react-navigation/native';
import EmojiPicker from 'rn-emoji-keyboard';
import {checkPermission} from '../../../redux/slices/PermissionSlice';

const LiveChat = ({route}) => {
  const {width} = useWindowDimensions();
  const user = useSelector(state => state.auth.user);
  const token = user.token;
  const id = user.user._id;
  const navigation = useNavigation();
  const obj = route.params;

  const [userName, setUserName] = useState('');
  const [message_id, setMessage_Id] = useState('');
  const [conversation_id, setConversationId] = useState('');
  const [receiver_id, setReceiverID] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [socket, setSocket] = useState(null); // Declare socket as a state variable
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null); // Use a ref to persist the socket instance
  const [calModal, setCalModal] = useState(false);
  const [callType, setCallType] = useState('');
  const [IncomingCallModal, setIncomingCallModal] = useState(false);
  const [callerName, setCallerName] = useState('');
  const [inComingCallURL, setIncomingCallURL] = useState('');
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteMessage_id, setDeleteMessage_id] = useState('');
  const [chatType, setChatType] = useState('');
  const [group_id, setGroup_id] = useState('');
  const [group_name, setGroupName] = useState('');
  const [reactiononmessage_id, setReactionOnMessage_id] = useState('');
  const [forwardMessage, setForwardMessage] = useState('');
  const [blockedUserInfo, setBlockedUserInfo] = useState({});

  //permissions
  const SendMessagehasPermission = useSelector(
    checkPermission({
      key1: 'Community',
      key2: 'community_chat_sendPrivateMessage',
    }),
  );

  const CallrequesthasPermission = useSelector(
    checkPermission({
      key1: 'Community',
      key2: 'community_chat_callRequest',
    }),
  );

  const addreactionhasPermission = useSelector(
    checkPermission({
      key1: 'Community',
      key2: 'community_chat_addReaction',
    }),
  );

  const viewConversationMessageshasPermission = useSelector(
    checkPermission({
      key1: 'Community',
      key2: 'community_chat_viewConversationMessages',
    }),
  );

  const fileUploadhasPermission = useSelector(
    checkPermission({
      key1: 'File',
      key2: 'file_upload',
    }),
  );

  const viewfilehasPermission = useSelector(
    checkPermission({
      key1: 'File',
      key2: 'file_view',
    }),
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (obj && obj.name && obj.receiver_id) {
        setUserName(obj.name);
        if (obj.receiver_id === id) {
          setReceiverID(obj.sender_id);
        } else {
          setReceiverID(obj.receiver_id);
        }
      }

      if (obj) {
        setMessage_Id(obj.message_id);
      }
      if (obj.conversation_id) {
        setConversationId(obj.conversation_id);
      }
      if (!obj.conversation_id) {
        setMessages([]);
        setConversationId('');
      }
      setChatType(obj.type);
      if (obj.group_id) {
        setGroup_id(obj.group_id);
        setGroupName(obj.group_name);
      }
    });

    return unsubscribe;
  }, [navigation, obj, id]);

  const messagesList = useRef(null);
  useEffect(() => {
    if (messagesList.current) {
      messagesList.current.scrollToEnd({animated: true});
    }
  }, [messages]);

  const sendMessage = async () => {
    try {
      if (!message && !attachment) {
        return;
      }
      let files = '';
      if (attachment) {
        files = await fileUploadOnServer();
      }
      let trimmedMessage = message ? message.trim() : '';
      let payload = {
        message: `<p>${trimmedMessage}</p>`,
        senderId: id,
        conversationId: conversation_id || '',
      };

      if (!conversation_id) {
        payload.receiverId = receiver_id;
      }
      if (chatType === 'group') {
        payload = {
          ...payload,
          groupId: group_id,
        };
      } else {
        payload = {
          ...payload,
          receiverId: receiver_id,
          conversationId: conversation_id || '',
        };
      }

      if (files) {
        payload = {
          ...payload,
          attachments: files,
        };
      }

      console.log(payload, 'payload');

      if (socket?.connected) {
        socket.emit('send_message', payload, acknowledgment => {
          if (acknowledgment?.error) {
            console.error('Message sending failed:', acknowledgment.error);
          }
        });
      }
      console.log(chatType);
      console.log(
        `v1/chat/${
          chatType === 'group' ? 'sendGroupMessage' : 'sendPrivateMessage'
        }`,
      );
      const response = await PostApi(
        `v1/chat/${
          chatType === 'group' ? 'sendGroupMessage' : 'sendPrivateMessage'
        }`,
        token,
        payload,
      );
      const res = await response.json();
      console.log(res.data.message);
      const newMessage = {
        _id: res.data.message._id, // Use message ID from the response
        message: res.data.message.message, // Use the actual message
        senderDetails: res.data.message.sender, // Sender info
        receiverDetails: res.data.message.receiver, // Receiver info
        isDeleted: res.data.message.isDeleted,
        isEdited: res.data.message.isEdited,
        isPinned: res.data.message.isPinned,
        messageType: res.data.message.messageType,
        messageStatus: res.data.message.messageStatus, // Delivery status array
        conversation: res.data.message.conversation, // Conversation ID
        createdAt: res.data.message.createdAt,
        updatedAt: res.data.message.updatedAt,
        timestamp: new Date().toISOString(),
        attachments: res.data.message.attachments || '',
      };
      setMessages([...messages, newMessage]);
      setMessage('');
      setAttachment(null);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const joinCallRequest = async () => {
    try {
      if (inComingCallURL) {
        setIncomingCallModal(false); // Close any modal if open
        navigation.navigate('WebViewScreen', {url: inComingCallURL}); // Pass the URL to the WebViewScreen
      } else {
        console.error('No URL found in the response');
        alert('Something went wrong. No URL found in the response.');
      }
    } catch (error) {
      console.error('Error sending video call request:', error);
      alert('Error sending video call request. Please try again.');
    }
  };

  const sendVideoCallRequest = async () => {
    try {
      const payload = {
        senderId: id,
        receiverId: receiver_id,
        type: callType || 'video_call',
      };

      console.log('Sending Payload:', payload);

      // Call the API
      const response = await PostApi('v1/chat/callRequest', token, payload);
      const rdata = await response.json();
      console.log('response of audio call api', rdata.data.url);

      if (rdata?.data?.url) {
        const url = rdata.data.url; // Access the URL from the response

        setCalModal(false); // Close any modal if open
        navigation.navigate('WebViewScreen', {url}); // Pass the URL to the WebViewScreen
      } else {
        console.error('No URL found in the response');
        alert('Something went wrong. No URL found in the response.');
      }
    } catch (error) {
      console.error('Error sending video call request:', error);
      alert('Error sending video call request. Please try again.');
    }
  };

  const readMessage = async () => {
    try {
      if (!conversation_id || !message_id) {
        return;
      }
      const payload = {
        messageId: message_id,
        conversationId: conversation_id,
        userId: id,
      };
      const response = await PostApi('v1/chat/readMessage', token, payload);
      const rdata = await response.json();
    } catch (error) {
      console.error('read chats:', error);
    }
  };

  const addReaction = async reaction => {
    try {
      if (!reactiononmessage_id) {
        return;
      }
      const payload = {
        messageId: reactiononmessage_id,
        reaction: reaction,
        group: group_id || '',
      };

      const response = await PostApi(
        'v1/chat/addReaction',
        token,
        payload,
        'PATCH',
      );
      const rdata = await response.json();
      const addinarray = {
        user: id,
        reaction: reaction,
        _id: rdata.data.message._id,
      };
      const newArray = messages.map(item => {
        // Only update the specific message with the reaction
        if (item._id === reactiononmessage_id) {
          return {
            ...item,
            reactions: [...(item.reactions || []), addinarray], // Ensure reactions array exists
          };
        }
        return item; // Return unchanged messages
      });

      // Update the state with the new array
      setMessages(newArray);
      console.log(rdata, 'reaction');
    } catch (error) {
      console.error('read chats:', error);
    }
  };

  const sendDeleteMessageRequest = async () => {
    try {
      let payload = {
        messageId: deleteMessage_id,
      };
      if (chatType === 'group') {
        payload = {
          ...payload,
          groupId: group_id,
        };
      } else {
        payload = {
          ...payload,
          conversationId: conversation_id || '',
        };
      }
      console.log('delete message request', payload);
      const response = await PostApi(
        `v1/chat/${chatType === 'group' ? 'groupMessage' : 'message'}`,
        token,
        payload,
        'DELETE',
      );
      const rdata = await response.json();
      const updatedMessages = await messages.map(mess => {
        if (mess._id === deleteMessage_id) {
          return {...mess, isDeleted: true};
        }
        return mess;
      });

      setMessages(updatedMessages);
      setDeleteModal(false);
    } catch (error) {
      console.error('Error sending video call request:', error);
      alert('Error sending video call request. Please try again.');
    }
  };

  const fetchChats = async () => {
    try {
      if (conversation_id) {
        setIsLoading(true);
        const response = await getApi(
          `v1/chat/getConversation/${conversation_id}?page=1&limit=20`,
          token,
        );
        if (response.success) {
          setIsLoading(false);
          const allMessages = response.data.messages;
          // console.log(response.data.blockedUserInfo, 'all');
          setBlockedUserInfo(response.data.blockedUserInfo);
          setMessages(allMessages);
          setIsLoading(false);
        } else {
          console.error('Error: Unable to fetch data');
          setIsLoading(false);
        }
      } else {
        setMessages([]);
      }
    } catch (error) {
      setIsLoading(false);
      console.error('Error fetching users:', error);
    }
  };

  const fileUploadOnServer = async () => {
    try {
      if (attachment) {
        setIsLoading(true);
        const file = attachment;
        const base64Data = await RNFS.readFile(file.uri, 'base64');
        const payload = {
          files: [
            {
              fileName: file.name,
              contentType: file.type,
              size: `${(file.size / (1024 * 1024)).toFixed(2)} mb`,
              isSaved: true,
              data: base64Data,
            },
          ],
        };
        const response = await PostApi(`v1/file/upload`, token, payload);
        const res = await response.json();
        setIsLoading(false)
        return res.data.files;
      }
    } catch (error) {
      setIsLoading(false)
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.allFiles],
      });
      setAttachment(result[0]);
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        console.log('User cancelled document picker');
      } else {
        console.log('Unknown error: ', err);
      }
    }
  };

  const openDocument = async uri => {
    try {
      await Linking.openURL(`${NEXT_PUBLIC_BUCKET_URL}/${uri}`);
    } catch (error) {
      console.log('Error opening document:', error);
    }
  };

  // useEffect(() => {
  //   if (obj && obj.name && obj.receiver_id) {
  //     setUserName(obj.name);
  //     if (obj.receiver_id === id) {
  //       setReceiverID(obj.sender_id);
  //     } else {
  //       setReceiverID(obj.receiver_id);
  //     }
  //   }

  //   if (obj) {
  //     setMessage_Id(obj.message_id);
  //   }
  //   if (obj.conversation_id) {
  //     setConversationId(obj.conversation_id);
  //   }
  //   setChatType(obj.type);
  //   if (obj.group_id) {
  //     setGroup_id(obj.group_id);
  //     setGroupName(obj.group_name);
  //   }
  //   console.log('group_name' + obj.group_name, obj.group_id);
  // }, [obj]);

  // useFocusEffect(
  //   React.useCallback(() => {
  //     if (obj && obj.name && obj.receiver_id) {
  //       setUserName(obj.name);
  //       if (obj.receiver_id === id) {
  //         setReceiverID(obj.sender_id);
  //       } else {
  //         setReceiverID(obj.receiver_id);
  //       }
  //     }

  //     if (obj) {
  //       setMessage_Id(obj.message_id);
  //     }
  //     if (obj.conversation_id) {
  //       setConversationId(obj.conversation_id);
  //     }
  //     setChatType(obj.type);
  //     if (obj.group_id) {
  //       setGroup_id(obj.group_id);
  //       setGroupName(obj.group_name);
  //     }
  //     // fetchChats();

  //     return () => {
  //       // Cleanup if needed
  //     };
  //   }, [obj, id]),
  // );

  useEffect(() => {
    (async () => {
      const socket = await connectionSocket();
      socketRef.current = socket;
      if (!id) return;

      if (id) {
        socket.emit(AUTHENTICATE_EVENT, id);
        socket.on(NEW_MESSAGE_EVENT, handleNewMessage);
        // socket.on(INCOMING_CALL, handleCall);
        socket.on(JOIN_EVENT_REQUEST, message => {
          console.log(message);
        });
        socket.on(MESSAGE_REACTION, reactionMessageHandler);
        socket.on(DELETE_MESSAGE_EVENT, handleEventDeleteMessage);
        // socket.on('disconnect', () => {
        //   console.log('Socket disconnected');
        //   socket.disconnect();
        //   socket.emit(DISCONNECT_EVENT, id);
        // });
        socket.on('error', err => {
          console.error('Socket error:', err);
        });
      }
    })();

    return () => {
      if (socketRef && socketRef.current) {
        socketRef.current.off(NEW_MESSAGE_EVENT, handleNewMessage);
        // socketRef.current.off(INCOMING_CALL, handleCall);
        // socket.current.off(MESSAGE_REACTION, reactionMessageHandler);
        socketRef.current.off(JOIN_EVENT_REQUEST, message => {
          console.log(message);
        });
        socketRef.current.off(DELETE_MESSAGE_EVENT, handleEventDeleteMessage);
        // socketRef.current.disconnect();
        // socketRef.current = null;
      }
    };
  }, [user, id]);

  const reactionMessageHandler = async ({message}) => {
    try {
      console.log(message,"reactionMessage")
      console.log(`v1/chat/getConversation/${conversation_id}?page=1&limit=20`);
      const con_id = await message.conversation
      const response = await getApi(
        `v1/chat/getConversation/${con_id}?page=1&limit=20`,
        token,
      );
      if (response.success) {
        const allMessages = response.data.messages;
        setMessages(allMessages);
      }
    } catch (error) {
      console.log(error, 'This is api get');
    }
  };

  const handleCall = async data => {
    console.log(data);
    const payload = {
      userId: id,
      roomId: data.roomId,
      type: data.type,
    };

    console.log('Sending Payload:', payload);
    const response = await PostApi('v1/chat/joinCallRequest', token, payload);
    const resdata = await response.json();
    console.log('response of request call api', resdata.data.url);
    if (resdata && resdata.data.url) {
      setCallerName(data.sender);
      setIncomingCallURL(resdata.data.url);
      setIncomingCallModal(true);
    }
  };

  const handleNewMessage = newMessage => {
    console.log('New message received:', newMessage);

    if (newMessage && newMessage.message) {
      // const formattedMessage = {
      //   _id: newMessage.message._id,
      //   attachments: newMessage.message.attachments,
      //   isDeleted: newMessage.message.isDeleted,
      //   isEdited: newMessage.message.isEdited,
      //   isPinned: newMessage.message.isPinned,
      //   message: newMessage.message.message,
      //   messageType: newMessage.message.messageType,
      //   receiverDetails: newMessage.message.receiver,
      //   senderDetails: newMessage.message.sender,
      //   createdAt: newMessage.message.createdAt,
      //   updatedAt: newMessage.message.updatedAt,
      // };
      setMessages(prevMessages => [...prevMessages, newMessage.message]);
    }
  };

  const handleEventDeleteMessage = async dmessage => {
    console.log("Before:", dmessage);
  //  console.log("After:", messages)
  //   const updatedMessages = messages.map((mess) =>
  //     mess._id === dmessage._id ||mess.messageId === dmessage._id ? { ...mess, isDeleted: true } : mess
  //   );
  //   setMessages(updatedMessages);
  //   console.log("Before:", messages)
    // console.log("After:", updatedMessages); // Log the updated array.
    // setMessages(updatedMessages); // Update the state with the modified array.
    // console.log(conversation_id)
    // console.log(dmessage.conversation)
    const con_id=await dmessage.conversation;
    const response = await getApi(
      `v1/chat/getConversation/${con_id}?page=1&limit=20`,
      token,
    );
    if (response.success) {
      const allMessages = response.data.messages;
      setMessages(allMessages);
    }
  };


 

  useEffect(() => {
    fetchChats();
    readMessage();
  }, [conversation_id]);

  const [reactionModalVisible, setReactionModalVisible] = useState(false);
  const [selectedReaction, setSelectedReaction] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleReactionSelect = reaction => {
    if (reaction === '+') {
      setReactionModalVisible(false);
      setIsOpen(true);
      return;
    }
    setSelectedReaction(reaction);
    setReactionModalVisible(false);
    addReaction(reaction);
  };

  const FLrenderItem = ({item}) => {
    const isCurrentUser =
      typeof item.senderDetails === 'object' && item.senderDetails !== null
        ? item.senderDetails._id === id
        : item.senderDetails === id;
    return (
      <View
        style={{
          flexDirection: 'row',
          alignSelf: isCurrentUser ? 'flex-end' : 'flex-start',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {isCurrentUser && (
          <TouchableOpacity
            onPress={() => {
              setDeleteModal(true);
              setDeleteMessage_id(item._id);
              setForwardMessage(
                item.message
                  .replace(/^"|"$/g, '') // Remove leading and trailing quotes
                  .replace(/(\r\n|\n|\r|<br\s*\/?>)+/g, ' ') // Replace extra line breaks or <br> with a single space
                  .trim(),
              );
            }}>
            <Icon
              name="keyboard-arrow-down"
              size={25}
              color="#ccc"
              style={{marginRight: 3}}
            />
          </TouchableOpacity>
        )}
        <View
          style={{
            backgroundColor: isCurrentUser ? '#ffffff' : '#e0d7ff',
            marginVertical: 5,
            borderRadius: 10,
            alignSelf: isCurrentUser ? 'flex-end' : 'flex-start',
            maxWidth: '80%',
            marginBottom: 15,
          }}>
          {item.isDeleted ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 10,
                paddingHorizontal: 10,
              }}>
              <MIcon name="circle-slash" size={16} color="#A9A9A9" />
              <Text
                style={{color: '#A9A9A9', fontStyle: 'italic', marginLeft: 5}}>
                This message has been deleted
              </Text>
            </View>
          ) : (
            <>
              {item.attachments[0] && item.attachments[0].path && (
                <View
                  style={{
                    marginTop: 5,
                    // borderBottomWidth: 1,
                    width: '100%',
                    borderBottomColor: '#ccc',
                    padding: 0,
                    paddingBottom: 10,
                  }}>
                  {viewfilehasPermission && (
                    <TouchableOpacity
                      onPress={() => openDocument(item.attachments[0].path)}
                      style={{alignSelf: 'flex-end', paddingHorizontal: 10}}>
                      <Icon name="file-download" color="#6b21a8" size={20} />
                    </TouchableOpacity>
                  )}

                  <View style={{flexDirection: 'row', paddingHorizontal: 10}}>
                    <Icon name="file-present" color="black" size={20} />
                    <Text
                      style={{
                        color: 'black',
                        flexWrap: 'wrap', // Allows text to wrap to the next line
                        width: '90%',
                      }}>
                      {`${item.attachments[0].name}`}
                    </Text>
                  </View>
                </View>
              )}
              {item.message &&
                item.message
                  .replace(/^"|"$/g, '') // Remove leading and trailing quotes
                  .replace(/(\r\n|\n|\r|<br\s*\/?>)+/g, ' ') // Replace extra line breaks or <br> with a single space
                  .trim() !== '<p></p>' &&
                item.attachments[0] &&
                item.attachments[0].path && (
                  <View
                    style={{
                      height: 1,
                      borderBottomWidth: 1,
                      borderColor: '#ccc',
                    }}></View>
                )}

              <Pressable
                style={{paddingHorizontal: 10}}
                disabled={!addreactionhasPermission}
                // onLongPress={() => {
                //   setDeleteModal(true);
                //   setDeleteMessage_id(item._id);
                // }}>
                onLongPress={() => {
                  setReactionOnMessage_id(item._id);
                  setReactionModalVisible(true);
                  setIsOpen(false);
                }}>
                {item.forwardedMessage &&
                  item.forwardedMessage.sender &&
                  item.forwardedMessage.sender.name && (
                    <View style={{flexDirection: 'row'}}>
                      <Icon
                        name="shortcut"
                        size={15}
                        color="#6b21a8"
                        style={{marginRight: 5}}
                      />
                      <Text style={{color: '#6b21a8', fontSize: 10}}>
                        {item.forwardedMessage.sender.name}
                      </Text>
                    </View>
                  )}

                <RenderHTML
                  contentWidth={width}
                  source={{
                    html: item.message
                      .replace(/^"|"$/g, '') // Remove leading and trailing quotes
                      .replace(/(\r\n|\n|\r|<br\s*\/?>)+/g, ' ') // Replace extra line breaks or <br> with a single space
                      .trim(),
                  }}
                  baseStyle={{color: '#4A4A4A', fontSize: 15}}
                  tagsStyles={{
                    p: {
                      margin: 0, // Remove default margin from <p> tag
                      padding: 5, // Remove default padding from <p> tag
                    },
                  }}
                />
              </Pressable>

              {item.reactions &&
                item.reactions[0] &&
                item.reactions[0].reaction && (
                  <View
                    style={{
                      position: 'absolute',
                      bottom: -15,
                      right: 5,
                      backgroundColor: '#fff',
                      borderRadius: 100,
                      paddingHorizontal: 5,
                      paddingVertical: 2,
                      shadowColor: '#000',
                      shadowOpacity: 0.1,
                      shadowRadius: 5,
                      elevation: 2,
                    }}>
                    <Text style={{fontSize: 13}}>
                      {item.reactions[0].reaction}
                    </Text>
                  </View>
                )}
            </>
          )}
        </View>
        {!isCurrentUser && (
          <TouchableOpacity
            onPress={() => {
              setDeleteModal(true);
              setDeleteMessage_id(item._id);
              setForwardMessage(
                item.message
                  .replace(/^"|"$/g, '') // Remove leading and trailing quotes
                  .replace(/(\r\n|\n|\r|<br\s*\/?>)+/g, ' ') // Replace extra line breaks or <br> with a single space
                  .trim(),
              );
            }}>
            <Icon
              name="keyboard-arrow-down"
              size={25}
              color="#ccc"
              style={{marginRight: 3}}
            />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#f4f0ff',
        marginTop: (Platform.OS === 'ios' && 50) || 0,
      }}>
      <View
        style={{
          padding: 10,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#6b21a8',
          justifyContent: 'space-between',
          height: 65,
        }}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <Icon
            name="arrow-back"
            size={24}
            color="#fff"
            onPress={() => navigation.navigate('ChatUsers')}
          />
          <View
            style={{
              width: 35,
              height: 35,
              borderRadius: 20,
              backgroundColor: '#ffffff',
              justifyContent: 'center',
              alignItems: 'center',
              marginHorizontal: 10,
            }}>
            <Text style={{color: '#6200ee', fontWeight: 'bold', fontSize: 16}}>
              {chatType === 'group'
                ? group_name.slice(0, 2).toUpperCase()
                : userName
                    .split(' ')
                    .slice(0, 2)
                    .map(word => word[0])
                    .join('')
                    .toUpperCase()}
            </Text>
          </View>
          <Text style={{color: '#fff', fontSize: 18, fontWeight: 'bold'}}>
            {chatType === 'group' ? group_name : userName}
          </Text>
        </View>
        {CallrequesthasPermission && (
          <View style={{flexDirection: 'row'}}>
            <TouchableOpacity
              disabled={
                (blockedUserInfo && blockedUserInfo.blockedByReceiver) ||
                blockedUserInfo.receiverBlocked
                  ? true
                  : false
              }
              onPress={() => {
                setCalModal(true);
                setCallType('audio_call');
              }}>
              <Icon
                name="call"
                size={24}
                color="#fff"
                style={{marginHorizontal: 10}}
              />
            </TouchableOpacity>

            <TouchableOpacity
              disabled={
                (blockedUserInfo && blockedUserInfo.blockedByReceiver) ||
                blockedUserInfo.receiverBlocked
                  ? true
                  : false
              }
              onPress={() => {
                setCalModal(true);
                setCallType('video_call');
              }}>
              <Icon name="videocam" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>
      {(blockedUserInfo && blockedUserInfo.blockedByReceiver) ||
      blockedUserInfo.receiverBlocked ? (
        <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
          <Text
            style={{
              color: '#ccc',
              fontSize: 20,
              fontWeight: 'bold',
              textAlign: 'center',
            }}>
            You are blocked
          </Text>
        </View>
      ) : (
        <>
          {viewConversationMessageshasPermission ? (
            <FlatList
              data={messages}
              keyExtractor={(item, index) =>
                item._id ? item._id.toString() : index.toString()
              }
              renderItem={FLrenderItem}
              ref={messagesList}
              contentContainerStyle={{padding: 5, paddingHorizontal: 20}}
            />
          ) : (
            <View
              style={{
                flex: 1,
                width: '100%',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Text
                style={{textAlign: 'center', fontSize: 18, fontWeight: 'bold'}}>
                You don't have permission to view conversation
              </Text>
            </View>
          )}

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 10,
              backgroundColor: '#ffffff',
              borderTopWidth: 1,
              borderTopColor: '#e0e0e0',
            }}>
            {fileUploadhasPermission && (
              <TouchableOpacity onPress={pickDocument}>
                {attachment && (
                  <View
                    style={{
                      height: 20,
                      width: 20,
                      borderRadius: 100,
                      backgroundColor: '#6b21a8',
                      marginTop: 5,
                      position: 'absolute',
                      top: -20,
                      left: 10,
                    }}>
                    <Text style={{textAlign: 'center', color: 'white'}}>1</Text>
                  </View>
                )}
                <Icon name="attach-file" size={24} color="#6200ee" />
              </TouchableOpacity>
            )}

            <TextInput
              style={{
                flex: 1,
                height: 40,
                marginHorizontal: 10,
                paddingHorizontal: 10,
                borderColor: '#6200ee',
                borderWidth: 1,
                borderRadius: 10,
                backgroundColor: '#fff',
              }}
              value={message}
              onChangeText={setMessage}
              placeholder="Type a message"
              placeholderTextColor="#6200ee"
            />
            {SendMessagehasPermission && (
              <TouchableOpacity onPress={sendMessage}>
                <Icon name="send" size={24} color="#6200ee" />
              </TouchableOpacity>
            )}
          </View>
        </>
      )}
      {isLoading && <Loader />}
      <CommingCallModal
        show={IncomingCallModal}
        onCancel={() => setIncomingCallModal(false)}
        onConfirm={() => {
          joinCallRequest();
        }}
        name={callerName}
      />
      <CallModal
        show={calModal}
        onCancel={() => setCalModal(false)}
        onConfirm={() => {
          // Handle the call confirmation logic here
          sendVideoCallRequest();
        }}
      />
      <DeleteMessageModal
        show={deleteModal}
        onCancel={() => setDeleteModal(false)}
        onDelete={() => {
          sendDeleteMessageRequest();
        }}
        message={forwardMessage}
        messageId={deleteMessage_id}
      />
      <EmojiPicker
        open={isOpen}
        onEmojiSelected={emoji => {
          setSelectedReaction(emoji); // Set the selected emoji as the reaction
          setReactionModalVisible(false); // Close the emoji picker modal
          setIsOpen(false); // Close the emoji picker
          addReaction(emoji.emoji); // Add reaction
        }}
        onClose={() => {
          setIsOpen(false); // Close the emoji picker modal if user closes it
          setReactionModalVisible(false); // Reopen the original modal
        }}
      />
      <Modal
        transparent={true}
        visible={reactionModalVisible}
        animationType="fade"
        onRequestClose={() => {
          setReactionModalVisible(false);
        }}>
        <TouchableOpacity
          onPress={() => {
            setReactionModalVisible(false);
          }}
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          }}>
          <View
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.80)',
              padding: 5,
              borderRadius: 50,
              alignItems: 'center',
              width: '85%',
            }}>
            <View style={{flexDirection: 'row', marginBottom: 0}}>
              {['😊', '😂', '👍', '❤️', '🙏', '🎉', '+'].map(reaction => (
                <TouchableOpacity
                  key={reaction}
                  onPress={() => handleReactionSelect(reaction)}
                  style={{margin: 5}}>
                  {reaction === '+' ? (
                    <View
                      style={{
                        backgroundColor: '#c2c2c2',
                        borderRadius: 100,
                        height: 35,
                        width: 35,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}>
                      <Text style={{fontSize: 25, color: 'black'}}>+</Text>
                    </View>
                  ) : (
                    <Text style={{fontSize: 24}}>{reaction}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};
export default LiveChat;
