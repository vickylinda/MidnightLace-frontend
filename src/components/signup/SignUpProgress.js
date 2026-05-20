import { StyleSheet, Text, View } from 'react-native';
import * as Progress from '@rn-primitives/progress';

import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

const steps = [
  { label: 'Creación', value: 1 },
  { label: 'Autorización', value: 2 },
  { label: 'Finalización', value: 3 },
];
const STEP_CIRCLE_SIZE = 36;
const trackSideInset = '16.66%';

export default function SignUpProgress({ currentStep = 1 }) {
  const progressValue = ((currentStep - 1) / (steps.length - 1)) * 100;
  const indicatorStyle = StyleSheet.flatten([
    styles.progressIndicator,
    {
      width: `${progressValue}%`,
    },
  ]);
  const trackStyle = StyleSheet.flatten([
    styles.progressRoot,
    {
      left: trackSideInset,
      right: trackSideInset,
    },
  ]);

  return (
    <View style={styles.container}>
      <Progress.Root max={100} style={trackStyle} value={progressValue}>
        <Progress.Indicator style={indicatorStyle} />
      </Progress.Root>

      <View style={styles.stepsRow}>
        {steps.map((step, index) => {
          const isActive = step.value === currentStep;
          const isComplete = step.value < currentStep;
          const stepAlignment = styles.middleStep;

          return (
            <View key={step.value} style={[styles.step, stepAlignment]}>
              <View
                style={[
                  styles.stepCircle,
                  isActive || isComplete ? styles.stepCircleActive : null,
                ]}
              >
                <Text style={styles.stepNumber}>{step.value}</Text>
              </View>
              <Text style={styles.stepLabel}>{step.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    marginBottom: 25,
    width: '100%',
  },
  progressRoot: {
    backgroundColor: 'rgba(117, 7, 25, 0.45)',
    height: 4,
    position: 'absolute',
    top: 17,
    zIndex: 0,
  },
  progressIndicator: {
    backgroundColor: colors.burgundy,
    height: '100%',
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'relative',
    width: '100%',
    zIndex: 1,
  },
  step: {
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  middleStep: {
    alignItems: 'center',
  },
  stepCircle: {
    alignItems: 'center',
    backgroundColor: '#70362E',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  stepCircleActive: {
    backgroundColor: colors.burgundy,
    borderColor: colors.blush,
    borderWidth: 2,
  },
  stepNumber: {
    color: colors.white,
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  stepLabel: {
    color: colors.textBurgundy,
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
  },
});
