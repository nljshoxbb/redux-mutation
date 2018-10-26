import {
  combineReducers,
  bindActionCreators,
  applyMiddleware,
  compose,
  __DO_NOT_USE__ActionTypes,
  customStore as customBasicStore,
} from './basic';
import convertMutationObjects from './convert-mutation-objects';
import functionsToAnys from './functions-to-anys';
import applyPlugin from './apply-plugin';
import isPlainObject from './utils/isPlainObject';
import { isObjectEmpty } from './utils/util';

/**
 * 创建经过修改后的createStore
 * @param {object} plugin plugin 会整合进options，可以理解为特殊的options，配合applyPlugin使用
 * @param {object} options 配置项，centers配置和convertMutationObjects配置
 * @param {object} 配置centersAliasName等
 * @return {object} ...createStore(...args)，返回的值跟redux createStore的是一致的。
 */
function createMutationStore(plugin = {}, options = {}) {
  options = {
    ...options,
    ...plugin,
  };
  const mutationObjectByNamespace = {};
  /**
   * 按照namespace的方式存放到mutationObjectByNamespace
   * @param {object | ...object | ...function} mutationObjects 请看functions-to.ays.js和conver-mutation-object.js注释
   */
  function setMutationObjectByNamespace(mutationObjects = {}) {
    if (!Array.isArray(mutationObjects)) {
      mutationObjects = [mutationObjects];
    }
    mutationObjects.forEach(mutationObject => {
      const namespace = mutationObject.namespace;
      if (namespace) {
        mutationObjectByNamespace[namespace] = mutationObject;
      }
    });
  }
  /**
   * @param {...object} mutationObjects 请看文件conver-mutation-object.js注释
   * @param preloadedState 跟redux的createStore的一样，没做修改
   * @param enhancer 跟redux的createStore的一样，没做修改
   * @return {object} 返回了一个经过适配后的store，属性完全跟redux的store一致
   */
  return (mutationObjects, preloadedState, enhancer) => {
    let reducerAndCenters = {};
    let onlyOrinalReducer = false; //mutationObjects格式是否是reducer格式
    if (typeof mutationObjects === 'function') {
      //mutationObjects是redux reducer格式
      //即function(state,action)
      onlyOrinalReducer = true;
      reducerAndCenters.reducer = mutationObjects;
      if (!isObjectEmpty(options)) {
        console.warn(
          'options param will not work when mutationObjects is reducer format.'
        );
      }
    } else {
      mutationObjects = functionsToAnys(mutationObjects);
      setMutationObjectByNamespace(mutationObjects);
      //options不做过滤
      reducerAndCenters = convertMutationObjects(mutationObjects, options);
    }
    //options不做过滤
    const store = customBasicStore(options)(
      reducerAndCenters,
      preloadedState,
      enhancer
    );
    return {
      replaceMutationObjects: createReplaceMutationObjects(
        store.replaceReducerAndCenters,
        {
          store,
          onlyOrinalReducer,
          mutationObjectByNamespace,
        },
        options
      ),
      ...store,
    };
  };
}
/**
 * @param {object} replaceReducerAndCenters 请查看./basic.js的相关注释
 * @param {object} options.store redux store实例
 * @param {object} options.onlyOrinalReducer mutationObjects的格式是redux的reducer格式
 * @param {object} options.mutationObjectByNamespace mutationObject的namespace为key的对象
 * @returns {function} replaceMutationObjects函数
 */
function createReplaceMutationObjects(
  replaceReducerAndCenters,
  { store, onlyOrinalReducer, mutationObjectByNamespace },
  options
) {
  //热替换或动态加载中使用
  /**
   * 可替换单个和多个
   * @param {object | ...object | ...function} mutationObjects 请看functions-to.ays.js和conver-mutation-object.js注释
   */
  return function(newMutationObjects) {
    if (onlyOrinalReducer) {
      return store.replaceReducer(newMutationObjects);
    }
    newMutationObjects = functionsToAnys(newMutationObjects);
    // console.log(newMutationObjects);
    newMutationObjects.forEach(mutationObject => {
      if (!isPlainObject(mutationObject)) {
        throw new TypeError('Expect mutationObject to be an plain object.');
      }
      if (!mutationObject.namespace) {
        throw new TypeError('Expect mutationObject.namespace to be defined.');
      }
      if (mutationObjectByNamespace[mutationObject.namespace]) {
        //redux reducer替换的时候，如果对应的state已经初始化了，那么initialState就会失效。
        console.warn(
          `The namespace "${
            mutationObject.namespace
          }" of mutationObject will be replaced,and the new "initialState" will lose efficacy because it has been initialized.`
        );
        //因为initialState无效，所以可以不定义。
        //这一步其实，可以不用getState，只要赋值不是undefined就行
        //下面为了对其上一个已经运行reducer后返回的state值。
        mutationObject.initialState = store.getState()[
          mutationObject.namespace
        ];
      }
      mutationObjectByNamespace[mutationObject.namespace] = mutationObject;
    });
    //重新赋值
    newMutationObjects = [];
    for (let key in mutationObjectByNamespace) {
      newMutationObjects.push(mutationObjectByNamespace[key]);
    }
    const reducerAndCenters = convertMutationObjects(
      newMutationObjects,
      options
    );
    replaceReducerAndCenters(reducerAndCenters);
  };
}
const createStore = createMutationStore();

export {
  createStore,
  combineReducers,
  bindActionCreators,
  applyMiddleware,
  compose,
  __DO_NOT_USE__ActionTypes,
  createMutationStore,
  applyPlugin,
};
