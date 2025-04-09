import { StatusBar } from "react-native";
import React,{Fragment} from "react";
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import FlashMessage from 'react-native-flash-message';
import AppNavigator from "./src/navigation/AppNavigator";
const App = () => {
  
  return (
    <Fragment>
      <StatusBar barStyle="dark-content"/>
      <GestureHandlerRootView style={{flex:1}}>
        <AppNavigator/> 
      </GestureHandlerRootView>
      <FlashMessage position="bottom"/>
    </Fragment>

  );
};

export default App;
