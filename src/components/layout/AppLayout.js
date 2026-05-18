import {
  Image,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';

import { colors } from '../../theme/colors';
import TopBar from './TopBar';

const TOP_BAR_HEIGHT = 120;
const FOOTER_VISIBLE_OFFSET_RATIO = 255 / 720;
const FOOTER_GAP = 38;

export default function AppLayout({ children, showLogo = true }) {
  const { height, width } = useWindowDimensions();
  const patternSize = width * (902 / 402);
  const contentHeight = Math.max(height - TOP_BAR_HEIGHT, 0);
  const bottomSceneHeight = Math.min(width * (447 / 402), contentHeight * 0.68);
  const bottomSceneWidth = bottomSceneHeight * 2;
  const bottomSceneOverlap = bottomSceneHeight * FOOTER_VISIBLE_OFFSET_RATIO;

  return (
    <View style={styles.outer}>
      <View style={styles.screen}>
        <TopBar showLogo={showLogo} />
        <ScrollView
          bounces={false}
          contentContainerStyle={[
            styles.content,
            {
              minHeight: contentHeight,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Image
            source={require('../../assets/decor/login-ornament.png')}
            style={[
              styles.backgroundPattern,
              {
                height: patternSize,
                left: width * (-253 / 402),
                top: width * (-28 / 402),
                width: patternSize,
              },
            ]}
            resizeMode="stretch"
            pointerEvents="none"
          />
          <View style={styles.topContent}>
            <Image
              source={require('../../assets/decor/puntilla.png')}
              style={styles.lace}
              resizeMode="stretch"
              pointerEvents="none"
            />
            {children}
          </View>
          <Image
            source={require('../../assets/decor/arabesque-background.png')}
            style={[
              styles.bottomScene,
              {
                height: bottomSceneHeight,
                marginTop: FOOTER_GAP - bottomSceneOverlap,
                width: bottomSceneWidth,
              },
            ]}
            resizeMode="stretch"
            pointerEvents="none"
          />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: '#F7EAF0',
    flex: 1,
  },
  screen: {
    backgroundColor: colors.cream,
    flex: 1,
    overflow: 'hidden',
  },
  content: {
    backgroundColor: colors.cream,
    flexGrow: 1,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  topContent: {
    zIndex: 2,
  },
  lace: {
    height: 30,
    width: '100%',
  },
  backgroundPattern: {
    opacity: 0.5,
    position: 'absolute',
    zIndex: 0,
  },
  bottomScene: {
    alignSelf: 'center',
    zIndex: 1,
  },
});
