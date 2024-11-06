import random
import string
import sympy

from Utilities.Utils import Decimal, dec, name

#Hard - Error interval (Decimal)
#Medium - Error interval (Whole number)
#Easy - Truncation 

def GenerateQuestion(level="hard"):
    variables = list(string.ascii_lowercase)
    random.shuffle(variables)
    var1 = sympy.symbols(variables.pop())
    person = name()
    if level == "hard":
        decimal_place = random.choice([1, 2])
        value = dec(decimal_place)
        if decimal_place == 1:
            plural = ""
            lower_bound, upper_bound = value - Decimal("0.05"), value + Decimal("0.05")
        else:
            plural = "s"
            lower_bound, upper_bound = value - Decimal("0.005"), value + Decimal("0.005")
        text = random.choice(["{0} writes down the value of {1} correct to {2} decimal place{3}. They write {4}. Complete the error interval for {1}", "A number {1} is rounded to {2} decimal place{3}. The result is {4}. Complete the error interval for {1}", "A number {1} is rounded to {2} decimal place{3}. The result is {4}. Using inequalities write down the error interval for {1}"])
        text = text.format(person, str(var1), str(decimal_place), plural, str(value))
    elif level == "medium":
        value = Decimal(str(dec(0))[:2])
        lower_bound, upper_bound = value - Decimal("0.5"), value + Decimal("0.5")
        object = random.choice([("nail", "millimetre"), ("pencil", "centimetre"), ("rope", "metre")])
        text = "The length of a {0} is {1} correct to the nearest {2}. Complete the error interval for the length of the {0}" 
        text = text.format(object[0], str(value), object[1])
    else:
        decimal_place = random.choice([0, 1, 2])
        value = dec(decimal_place)
        whole = len(str(value).split(".")[0])
        length = whole + decimal_place
        if length == 1:
            plural = ""
        else:
            plural = "s"
        if decimal_place == 0:
            value = int(value)
            lower_bound, upper_bound = value, value + 1
        elif decimal_place == 1:
            lower_bound, upper_bound = value, value + Decimal("0.1")
        elif decimal_place == 2:
            lower_bound, upper_bound = value, value + Decimal("0.01")
        text = random.choice(["{0} truncates the number {1} to {2} digit{3}. The result is {4}. Write down the error interval for {1}", "{0} used a calculator to work out the value of a number {1}. The answer on her calculator display began {4}. Complete the error interval for {1}"])
        text = text.format(person, str(var1), str(length), plural, value)       
    answer = "{} ≤ {} < {}".format(lower_bound, str(var1), upper_bound)
    return text, answer