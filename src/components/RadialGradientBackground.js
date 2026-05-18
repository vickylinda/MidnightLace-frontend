import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Rect, Stop } from 'react-native-svg';

export default function RadialGradientBackground({ children }) {
  const { width, height } = useWindowDimensions();
  const ellipseRadiusX = width * 0.87;
  const ellipseRadiusY = height * 0.43;
  const ellipseCenterY = height * 0.485;

  return (
    <View style={styles.container}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient
            id="splashGradient"
            cx="50%"
            cy="50%"
            rx="50%"
            ry="50%"
            fx="50%"
            fy="50%"
          >
            <Stop offset="26%" stopColor="#FCEBDB" stopOpacity="0.7" />
            <Stop offset="100%" stopColor="#9F021D" stopOpacity="1" />
          </RadialGradient>
        </Defs>
        <Rect width={width} height={height} fill="#9F021D" />
        <Ellipse
          cx={width / 2}
          cy={ellipseCenterY}
          rx={ellipseRadiusX}
          ry={ellipseRadiusY}
          fill="url(#splashGradient)"
        />
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
