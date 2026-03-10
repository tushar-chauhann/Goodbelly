import React, { useRef, useEffect, useCallback, memo } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  FlatList,
} from "react-native";
import tw from "twrnc";
import { fontStyles } from "../../utils/fontStyles";

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);
const ITEM_HEIGHT = 80;

const LeftCategories = ({
  leftList,
  loadingCatsOccs,
  errorCatsOccs,
  selectedToken,
  onCategorySelect,
  scrollY, // Ensure this is passed from parent or we use local if needed, but parent passed it so we use it.
  flatListRef,
  scrollToSelectedItem,
  isInitialMount,
  hasHandledInitialSelection,
  ingredientId,
}) => {
  //   SLIDING INDICATOR: Position state
  const selectionY = useRef(new Animated.Value(0)).current;

  // Update selection position when selectedToken changes
  useEffect(() => {
    if (selectedToken && leftList.length > 0) {
      const index = leftList.findIndex((item) => item.id === selectedToken);
      if (index !== -1) {
        Animated.timing(selectionY, {
          toValue: index * ITEM_HEIGHT,
          duration: 500, // Slow, visible slide
          useNativeDriver: true,
          // bezier: Easing.inOut(Easing.ease), // Optional for ease-in-out feel
        }).start();
      }
    }
  }, [selectedToken, leftList, selectionY]);

  if (ingredientId) {
    return null;
  }

  // CategoryItem with zoom animation
  const CategoryItem = memo(
    ({ item, isSelected, onPress, itemHeight }) => {
      const scaleAnim = useRef(new Animated.Value(1)).current;

      useEffect(() => {
        Animated.timing(scaleAnim, {
          toValue: isSelected ? 1.15 : 1,
          duration: 400, // Slow animation (400ms)
          useNativeDriver: true,
        }).start();
      }, [isSelected, scaleAnim]);

      return (
        <TouchableOpacity
          onPress={() => onPress(item.id)}
          style={[
            tw`items-center justify-center relative`,
            { height: itemHeight },
          ]}
          activeOpacity={0.7}
        >
          <Animated.View
            style={[
              tw`w-12 h-12 rounded-full overflow-hidden items-center justify-center bg-white border`,
              isSelected
                ? tw`border-2 border-[#6B9080] shadow-sm`
                : tw`border-gray-200 border-opacity-50`,
              {
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <Image
              source={{ uri: item.image }}
              style={tw`w-8 h-8 rounded-full`}
            />
          </Animated.View>
          <Text
            numberOfLines={2}
            style={[
              fontStyles.headingS,
              tw`text-[10px] text-center mt-1 leading-3 px-1 w-full`,
              isSelected
                ? tw`text-[#6B9080] font-bold`
                : tw`text-gray-500 font-medium`,
            ]}
          >
            {item.name}
          </Text>
        </TouchableOpacity>
      );
    },
    (prev, next) =>
      prev.item.id === next.item.id && prev.isSelected === next.isSelected
  );

  const renderItem = useCallback(
    ({ item }) => {
      return (
        <CategoryItem
          item={item}
          isSelected={selectedToken === item.id}
          onPress={onCategorySelect}
          itemHeight={ITEM_HEIGHT}
        />
      );
    },
    [selectedToken, onCategorySelect]
  );

  const getItemLayout = useCallback(
    (data, index) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  const keyExtractor = useCallback((item) => String(item.id), []);

  return (
    <View
      style={tw`w-20 bg-gray-50 pt-2 border-r border-gray-100 relative h-full overflow-hidden`}
    >
      {loadingCatsOccs ? (
        <View style={tw`items-center py-10`}>
          <ActivityIndicator size="small" color="#6B9080" />
        </View>
      ) : (
        <>
          {/*   SHARED ANIMATED INDICATOR */}
          <Animated.View
            style={[
              tw`absolute right-0 w-1 bg-[#6B9080] rounded-l-full`,
              {
                height: 55, // Height of the bar (increased from 40)
                top: 8 + (ITEM_HEIGHT - 55) / 2, // Initial offset (pt-2 = 8px) + Centering
                transform: [
                  {
                    translateY: Animated.subtract(selectionY, scrollY),
                  },
                ],
                zIndex: 10, // Ensure it's above list but below specific overlays if any
              },
            ]}
          />

          <AnimatedFlatList
            ref={flatListRef}
            data={leftList}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={tw`pb-20`}
            decelerationRate="fast"
            //   REMOVED: snapToInterval and snapToAlignment to prevent auto-scroll
            // snapToInterval={ITEM_HEIGHT}
            // snapToAlignment="center"
            getItemLayout={getItemLayout}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: true }
            )}
            //   REMOVED: onLayout auto-scroll to prevent interrupting user browsing
            // onLayout={() => {
            //   if (selectedToken && leftList.length > 0 && !hasHandledInitialSelection.current) {
            //     requestAnimationFrame(() => {
            //       scrollToSelectedItem();
            //       hasHandledInitialSelection.current = true;
            //     });
            //   }
            // }}
            onScrollToIndexFailed={(info) => {
              const wait = new Promise((resolve) => setTimeout(resolve, 100));
              wait.then(() => {
                flatListRef.current?.scrollToOffset({
                  offset: info.averageItemLength * info.index,
                  animated: true,
                });
              });
            }}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews={true}
          />
        </>
      )}
      {errorCatsOccs && (
        <Text
          style={[
            fontStyles.body,
            tw`text-[9px] text-red-500 text-center px-1 mt-4`,
          ]}
        >
          {errorCatsOccs}
        </Text>
      )}
    </View>
  );
};

export default memo(LeftCategories);
