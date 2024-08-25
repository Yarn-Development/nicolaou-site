import random
import string
import sympy

from Utilities.Utils import num, op

#Hard - Factor
#Easy - Linear

def GenerateQuestion(level="hard"):
    variables = list(string.ascii_lowercase)
    random.shuffle(variables)
    var1, var2 = sympy.symbols(variables.pop()+","+variables.pop())
    if level == "hard":
        formula = sympy.sympify("("+num()+"*"+str(var1)+op()+num()+")/("+str(var1)+op()+num()+")")
    else:
        formula = sympy.sympify(str(var1)+"/"+num()+op()+num())
    equation = sympy.Eq(formula, var2)
    solution = sympy.solve(equation, var1)[0]
    text = "Make {} the subject of the forumla {} = {}".format(str(var1), str(var2), str(formula))
    answer = "{} = {}".format(str(var1), str(solution))
    return text, answer