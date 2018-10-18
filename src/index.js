import combineCenters from 'redux-center/lib/combine-centers';

import {
  combineReducers,
  bindActionCreators,
  applyMiddleware,
  compose,
  __DO_NOT_USE__ActionTypes,
  customStore as customBasicStore,
} from './basic';
import convertMutationObjects from './convert-mutation-objects';
// import isPlainObject from './utils/isPlainObject';

/**
 * 创建经过修改后的createStore
 * @param {object} options 配置项，centers配置和convertMutationObjects配置
 * @param {object} 配置centersAliasName等
 * @return {object} ...createStore(...args)，返回的值跟redux createStore的是一致的。
 */
function customStore(options) {
  if (!options) {
    options = {};
  }
  const { centersAliasName, ...centerOptions } = options;
  /**
   * @param {object} mutationObjects 请看文件conver-mutation-object.js注释
   * @param preloadedState 跟redux的createStore的一样，没做修改
   * @param enhancer 跟redux的createStore的一样，没做修改
   * @return {object} 返回了一个经过适配后的store，属性完全跟redux的store一致
   */
  return (mutationObjects, preloadedState, enhancer) => {
    let reducerAndCenters;
    if (typeof mutationObjects === 'function') {
      reducerAndCenters = mutationObjects;
    } else {
      reducerAndCenters = convertMutationObjects(mutationObjects, {
        combineCenters,
        centersAliasName,
      });
    }
    const store = customBasicStore(centerOptions)(
      reducerAndCenters,
      preloadedState,
      enhancer
    );
    return {
      replaceMutationObjects: createReplaceMutationObjects(
        store.replaceReducerAndCenters,
        { centersAliasName }
      ),
      ...store,
    };
  };
}
function createReplaceMutationObjects(
  replaceReducerAndCenters,
  { centersAliasName }
) {
  //热替换或动态加载中使用
  return mutationObjects => {
    const reducerAndCenters = convertMutationObjects(mutationObjects, {
      centersAliasName,
      combineCenters,
    });
    replaceReducerAndCenters(reducerAndCenters);
  };
}
const createStore = customStore();

export {
  createStore,
  combineReducers,
  bindActionCreators,
  applyMiddleware,
  compose,
  __DO_NOT_USE__ActionTypes,
  customStore,
  combineCenters,
  convertMutationObjects,
};
