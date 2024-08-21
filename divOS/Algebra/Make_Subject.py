import random
import string
import sympy

def num():
    return str(random.randint(1,9))

def op():
    return random.choice(["+", "-"])

def GenerateQuestion(level="hard"):
    variables = list(string.ascii_lowercase)
    random.shuffle(variables)
    var1, var2 = sympy.symbols(variables.pop()+","+variables.pop())
    if level == "hard":
        formula = sympy.sympify("("+num()+"*"+str(var1)+op()+num()+")/("+str(var1)+op()+num()+")")
    else:
        formula = sympy.sympify(str(var1)+"/"+num()+op()+num())
    text = "Make "+str(var1)+" the subject of the forumla "+str(formula)
    equation = sympy.Eq(formula, var2)
    solution = sympy.solve(equation, var1)[0]
    text = "Make "+str(var1)+" the subject of the forumla "+str(var2)+" = "+str(formula)
    answer = str(var1)+" = " +str(solution)
    return text, answer