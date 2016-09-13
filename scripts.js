/*function Menu ( menuElem, eventSource ) {
	var MAIN_DELAY = 10;
	var EXPANDED_PARAM = 256;

	setExpandRequestHandler ( eventSource, function f (  ) {
		var calculatedParam = expandElement ( menuElem );
		if ( ! expansionComplete ( calculatedParam ) ) {
			setTimeout ( f, MAIN_DELAY );
		}
	} );
	
	function setExpandRequestHandler ( src, hnd ) {
		src .onmouseenter = hnd;	//onmouseleave - over/out (всплывают, срабатывают на потомках). targert и relatedTarget (fromElement и toElement для ИЕ для овер и аут, соответственно)
	}
	
	this .expand = function (  ) {
		var v = CU .getStyle ( elem );
		var newVal = parseFloat ( v ) * 2;
		elem .style .width = newVal + "px";
		return newVal;
	}
	
	this .setCurrent;
	
	function expansionComplete ( value ) {
		return value >= EXPANDED_PARAM;
	}
}*/

var CU = {};
CU .DEFAULT_TIMEOUT = 10;
CU .getStyle = function ( elem, pseudo ) {
	return window .getComputedStyle ? getComputedStyle ( elem, pseudo ? pseudo : "" ) : elem .currentStyle;	//Возвращает абсолютные значения в виде строки с единицами измерения, то есть в пикселлах, а не % или auto, требует полного свойства (borderLeftWidth а не border), не работает В ИЕ8-
}
CU .shedule = function ( f ) {
	return setTimeout ( f, CU .DEFAULT_TIMEOUT );
}
CU .reset = function ( timerId ) {
	clearTimeout ( timerId );
}

window .onload = function (  ) {

	createSticker ( "sticker" );
	createSlider ( "slider" );
};

//element, endValue, phazeCount, change (), sequence ()
function createSticker ( elemId ) {
	var PHAZE_COUNT = 24;

	var sticker = document .getElementById ( elemId );
	var animator = new Animate ( sticker,
		Animate .createSequence ( Animate .sequenceS3Binom, PHAZE_COUNT ), 
		Animate .changeOpacity );
	
	sticker .onmouseover = function (  ) {
		animator .go ( -1 );
	};
	sticker .onmouseout = function (  ) {
		animator .back ( (Animate .createSequence ( Animate .sequenceS3Binom, 64 ))() );
	};
}

function createSlider ( elemId ) {
	var PHAZE_COUNT = 64;
	var slider = document .getElementById ( "slider" );
	var animator = new Animate ( slider .querySelector ( ".slider-box" ),
		Animate .createSequence ( Animate .sequenceS3Binom, PHAZE_COUNT ),
		Animate .changePosition );
	var itemValue = parseFloat ( CU .getStyle ( slider .querySelector ( ".slider-box div" ) ) .width );
	slider .querySelector ( ".left-arrow" ) .onclick = function (  ) {
		animator .go ( itemValue );	//!!	How to avoid calculating and specify something like "until the next element will be reached"
	};
	slider .querySelector ( ".right-arrow" ) .onclick = function (  ) {
		animator .go ( -itemValue );
	}
}
/*
	Состояния: текущий, (родитель текущего?), активен, исходное
	Отображение: раскрыт, активен, выделен, исходное
	Анимация: раскрытие/сворачивание, выделение/снятие, текущий, длинное название


function animate ( element, condition, change ) {
	if ( ! condition ( element ) ) {
		change ( element );
		CU .shedule ( function (  ) { animate ( element, condition, change ) } );
	}
}
animate (
	someElement,
	function (  ) { var desired = calculateDesiredValue ( someElement ); return function ( element ) { return getValue ( element ) >= desired; } },
	function ( element ) { doSomethingWith ( element ); }
);

//С пошаговым вычислением
function animate ( element ) {
	var desired = calculate ( element );
	function a (  ) {
		if ( checkCondition ( element, desired ) ) {
			setValue ( element, desired );
			return;
		}
		change ( element );
		shedule ( a );
	} (  );
}

//С предварительным расчётом
function animate ( element ) {
	var sequence = createSequence ( element );
	var phaze = 0;
	function a (  ) {
		if ( phaze >= PHAZE_COUNT ) {
			return;
		}
		setValue ( element, sequence [phaze++] );
		shedule ( a );
	} (  );
}*/

function Animate ( element, sequenceFunction, changeFunction ) {
	var self = this;
	var phaze = 0;
	var basicSequence = sequenceFunction (  );
	var currentTimer = null;
	
	var DEFAULT_STATE = 0;
	var GO_STATE = 1
	var BACK_STATE = 2;
	
	var state = DEFAULT_STATE;
	var basic, desired;
	
	//Установить значение величины в des в соответствии с func так чтобы максимальный шаг не превышал lim. Вычисляется количество шагов
	this .goAs = function ( cond, func, lim ) {}
	//Установить значение величины в des
	this .goTo = function ( des, seq ) {
		self .go ( des - changeFunction ( element ), seq );
	}
	//Изменять по закону series (функция - математический ряд, то есть должна принимать предыдущее зачение) до наступления условия cond. Количество шагов не определено
	this .goUntil = function ( cond, series ) {
		var WATCHDOG = 256;
		var s = [], p = basic, i = 1;
		s [0] = basic;
		
		while ( i < WATCHDOG ) {
			p = series ( p );
			if ( cond ( p ) )
				break;
			s [i++] = p;
		}
		
		var d = s [s .length - 1];
		for ( i = 0; i < s .length; i++ ) {
			s [i] = (s [i] - basic) / (d - basic);
		}
		
		self .go ( d, s );
	}
	/*
		Изменить элемент посредством changeFunction на величину des в соответствии с последовательностью seq
		Значение des может быть отрицательным. Последовательность seq должна быть восходящей. Некоторые
		последовательности можно сформировать посредством статических функций sequence*
	*/
	this .go = function ( des, seq ) {
		if ( des == 0 )
			return;
	
		desired = des;
		var sequence = seq || basicSequence;
		
		if ( state == DEFAULT_STATE ) {
			phaze = 1;
			basic = changeFunction ( element );
		}
		
		if ( state == GO_STATE && seq ) {
			phaze = findNearestPhaze ( sequence );
		}
		
		if ( state == BACK_STATE ) {
			if ( seq )
				phaze = findNearestPhaze ( sequence );
			CU .reset ( currentTimer );
		}
		state = GO_STATE;
		
		(function a (  ) {
			if ( phaze >= sequence .length ) {
				state = DEFAULT_STATE;
				return;
			}
			changeFunction ( element, basic + desired * sequence [phaze++] );
			currentTimer = CU .shedule ( a );
		}) (  );
	};
	this .back = function ( seq ) {
	
		var sequence = seq || basicSequence;
		if ( state == DEFAULT_STATE )
			phaze = sequence .length - 1;
		
		if ( state == BACK_STATE && seq ) {
			phaze = findNearestPhaze ( sequence );
		}
		
		if ( state == GO_STATE ) {
			if ( seq ) {
				phaze = findNearestPhaze ( sequence );
			}
			CU .reset ( currentTimer );
		}
		state = BACK_STATE;
		
		(function b (  ) {
			if ( phaze < 0 ) {
				state = DEFAULT_STATE;
				return;
			}
			changeFunction ( element, basic + desired * sequence [phaze--] );
			currentTimer = CU .shedule ( b );
		}) (  );
	};

	/*
			First this performed a search of the next phaze of animation when event occures while animation
		i. e. put a mouse over an element and out it in a moment. It was a bit strange from my side cause of
		using phaze variable in the function code. Quite later, having some meditation, I had understood
		the absurdity of situation and no longer use it
			Besides, such approach has some problems, needed to be resolved, namely:
		* values in the array can be descending, so we can`t simply compare that local current is bigger then current
		* when we do backward animation we has to descend on the array
			Writing this I`ve recalled the sence of finding phaze: it`s necessary while we can pass into go or back
		function a sequence, differed of basic one, so it`s necessary to find in a new sequence a value, nearest
		to a current for soft transition
		
			Thus the function do the following:
		* finad the value in the new sequence that follows the current onerror
		* get the next or previous item, dependent of state, making a little loop such way
		* returns finded index
		
		Tip. We needn`t use different code for positive and negative desired variable, but if we decide to do
		a DESCENDING SEQUENCE, the code has to be modified, so sequences for go and goTo should be ascending
		until the code isn`t modified
	*/
	function findNearestPhaze ( s ) {
		var p = state == BACK_STATE ? s .length - 1 : (state == GO_STATE ? 0 : 0);
		for ( i = 0; i < s .length; i++ ) {
			if ( s [i] >= basicSequence [phaze] ) {
				p = state == BACK_STATE ? i-1 : (state == GO_STATE ? i+1 : 0 );
				break;
			}
		}
		return p;
	}
}

/*
	Function f has to return values in range 0 to 1
	Further functions preffixed with "sequence" are to be used as an argument
*/
Animate .createSequence = function ( f, PHAZE_COUNT ) {
	return function (  ) {
		var s = [];
		s[0] = 0;
		for ( var i = 1; i < PHAZE_COUNT; i++ ) {
			s [i] = f ( i, PHAZE_COUNT );
		}
		return s;
	};
}
Animate .sequence3Binom = function ( i, total ) {
		//return Math .pow ( i/5, 3 )/PHAZE_COUNT;
		return Math .pow ( i/(total-1), 3 );	//function ( startSize, i, cnt ) { return  }
}
Animate .sequenceExp = function ( i, total ) {
		return Math .exp ( i/(total-1) ) / Math .E;
}
Animate .sequenceS3Binom = function ( i, total ) {
		if ( i < (total / 2) )
			return (Math .pow ( 2*i/(total-1), 4 ))/2;	//function ( startSize, i, cnt ) { return  }
		else
			return (2 - Math .pow ( 2*(total-i)/(total-1), 4 ))/2;
}
Animate .sequenceDiv = function ( element ) {
	var s = [];
	s[PHAZE_COUNT - 1] = 1;
	for ( var i = PHAZE_COUNT - 2 ; i > 0; i-- ) {
		s [i] = s[i+1] / 1.4;
	}
	s[0] = 0;
	return s;
}

//Следующие функции инкапсулируют код изменения параметров, тех которые скорее всего могут участвовать в анимации
//Их не обязательно размещать именно здесь и можно просто передавать соответствующий код в консоруктор аниматора
//Главное чтобы функция принмала элемент и значение, а в случае отсутствия значения, возвращала текущее
Animate .changeHeight = function ( element, value ) {
	if (value === undefined) {	//Проверка !value даст ПРАВДУ при value == 0
		return parseFloat ( CU .getStyle ( element ) .height );
	}
	element .style .height = value + "px";
}
Animate .changeWidth = function ( element, value ) {
	if (value === undefined) {
		return parseFloat ( CU .getStyle ( element ) .width );
	}
	element .style .width = value + "px";
}
Animate .changePosition = function ( element, value ) {
	if (value === undefined) {
		return parseFloat ( CU .getStyle ( element ) .marginLeft );
	}
	element .style .marginLeft = value + "px";
}
Animate .changeOpacity = function ( element, value ) {
	if (value === undefined) {
		return parseFloat ( CU .getStyle ( element ) .opacity );
	}
	element .style .opacity = value;
}