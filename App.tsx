import { StatusBar } from "react-native";
import React,{Fragment} from "react";
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import FlashMessage from 'react-native-flash-message';
import AppNavigator from "./src/navigation/AppNavigator";
import { ChatProvider } from "./ChatProvider,";
const App = () => {
  
  return (
    <Fragment>
      <StatusBar barStyle="dark-content"/>
      <GestureHandlerRootView style={{flex:1}}>
        <ChatProvider>
          <AppNavigator/> 
        </ChatProvider>
      </GestureHandlerRootView>
      <FlashMessage position="top"/>
    </Fragment>

  );
};

export default App;
