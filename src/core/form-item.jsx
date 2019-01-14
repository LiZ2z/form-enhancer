import React from 'react';
import PropTypes from 'prop-types'
import Context from './context'

/**
 * @component 
 * 
 * 
 * @prop {string} name 表单 name字段
 * @prop {array|string} dependence 依赖表单的name字段组成的数组， 当依赖发生变化时， 会通知此表单， 并执行handler
 * @prop {function} onDepChange 当依赖改变时，会触发此函数
 * @prop {}
 */
class FormItem extends React.PureComponent {
  constructor(props) {
    super(props)
    this.state = {
      // 优先取 value的值, 其次去defaultValue 的值
      value: props.hasOwnProperty('value') ? props.value : (props.hasOwnProperty('defaultValue') ? props.defaultValue: void 0),
      validateResult: null
    }
    this.onBlur = this.onBlur.bind(this)
    this.onFocus = this.onFocus.bind(this)
    this.onChange = this.onChange.bind(this)
    this.onDepChange = this.onDepChange.bind(this)
    this.validator = this.validator.bind(this)
    this.hideTip = this.hideTip.bind(this)
  }
  componentDidMount() {
    const props = this.props
    let depQueue = props.dependence

    if(depQueue && typeof depQueue === 'string' ) {
      depQueue = [depQueue]
    }

    props.interfaces({
      depQueue: depQueue,
      subscribeDepChange: this.onDepChange,
      item: this
    })

    if(this.state.value || this.state.value === 0) {
      this.changeState(false, this.state.value)
    }
  }
  UNSAFE_componentWillReceiveProps(nextP){
    if(nextP.value !== this.props.value) {
      this.changeState(false, nextP.value)
    }
  }

  /**
   * @function - 当该组件的依赖项发生改变, 会触发此函数,
   * @param {string} name
   * @param {array} valueQueue
   */
  onDepChange(name, valueQueue) {
    const fn = this.props.onDepChange
    if(!fn) {
      if(process.env.NODE_ENV === 'development'){
        console.error(new ReferenceError(`你忘记传入name: ${this.props.name}的onDepChange处理函数`))
      }
      return
    }
    this.changeState(true, fn(name, ...valueQueue))
  }
  /**
   * @function - 处理表单onChange事件
   * 
   */
  onChange(...valueQueue) {
    this.changeState(true, ...valueQueue)
  }

  changeState(shouldEmit, ...valueQueue){
    let exactV = valueQueue[0]
    if(this.props.filter ){
      try{
        exactV = this.props.filter(exactV)
      }catch (e) {
        throw e
      }
    }
    // this.state.value = exactV
    this.setState({value: exactV}) 
    // 这里有时会因为filter后的值跟原值相同，又使用了pureComponent 导致不更新
    // 但是view层显示的值却是未经filte的值（输入什么，view层就显示什么，必须通过js更新才能替换掉）
    // 导致bug， 因此强制更新
    this.forceUpdate()
    valueQueue[0] = exactV
    this.props.onChange(this.props.name, valueQueue, shouldEmit)
  }
  /**
   * 失去焦点时进行验证
   * */
  onBlur() {
    this.validator()
    this.showTip()
  }
  /**
   * 获取焦点时，隐藏所有的提示
   * */
  onFocus() {
    const oneOf = this.props.oneOf
    if(oneOf) {
      this.props.items.forEach(item=> {
        if(oneOf.indexOf(item.props.name)>-1) {
          item.hideTip()
        }
      })
    }
    if(!this.state.validateResult) return
    this.setState({validateResult: null})
  }
  // 失去焦点时，验证一次，错误就设置错误数据
  // 如果之前是错误，下次输入的时候进行一次
  //   -- 如果成功了，隐藏错误提示，或者显示成功提示
  //   -- 如果失败了，继续显示
  validator() {

    const value = this.state.value
    const props = this.props
    let  result = props.validator(value, props.getQuery())
    let boolResult = true
    // -1 如果未返回值， 则判定为 true
    if(typeof result === 'undefined'){
      boolResult = true
      result = null
    }
    // -2 如果返回的是布尔值，直接返回
    else if(typeof result === 'boolean') {
      boolResult = result
      result = null
    }
    // -2 返回了除了以上的任何值，判定为false
    else {
      boolResult = false
    }
    this.tip = result
    return boolResult
  }
  showTip(){
    this.setState({ validateResult: this.tip })
  }
  hideTip(){
    this.setState({ validateResult: null })
  }
  render() {
    const state = this.state

    return (
      this.props.children(
        state.value,
        {
          onChange: this.onChange,
          onBlur: this.onBlur,
          onFocus: this.onFocus
        },
        state.validateResult)
    )
  }
}

FormItem.defaultProps = {
  validator: () => true
}

FormItem.propTypes = {
  onDepChange: PropTypes.func,
  dependence: PropTypes.oneOfType([ PropTypes.array, PropTypes.string]),
  name: PropTypes.string,
  validator: PropTypes.func,
}



export default class FormContextConsumer extends React.PureComponent {
  render() {
    return (
      <Context.Consumer>
        { obj => <FormItem {...this.props} {...obj}/> }
      </Context.Consumer>
    )
  }
}