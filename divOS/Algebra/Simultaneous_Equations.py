import random
import os
import subprocess
import sympy
from Utilities.Utils import num, num_small, op

#Hard - Standard
#Medium - Multiple varible
#Easy - Same varible

#May add quadratic

def GenerateQuestion(level="hard"):
    var1, var2 = sympy.symbols("x,y")
    solution = None
    if level == "hard":
        while True:
            expr1 = sympy.sympify(op()+num()+"*"+str(var1)+op()+num()+"*"+str(var2))
            expr2 = sympy.sympify(op()+num()+"*"+str(var1)+op()+num()+"*"+str(var2))
            eq1, eq2 = sympy.Eq(expr1, random.randint(-20,30)), sympy.Eq(expr2, random.randint(-20,30)) 
            solution = sympy.solve((eq1, eq2), (var1, var2))
            if solution and all(-15 <= sympy.denom(val) <= 10 and -15 <= val <= 15 and val != 0 for val in solution.values()):
                break   
    elif level == "medium":
        while True:
            if random.choice([True, False]):
                if random.choice([True, False]):
                    coeff1, coeff2 = num_small(), op()+str(num())
                    coeff3, coeff4 = op()+str(int(coeff1)*random.choice([2,3])), op()+str(num())
                else:
                    coeff3, coeff4 = num_small(), op()+str(num())
                    coeff1, coeff2 = op()+str(int(coeff3)*random.choice([2,3])), op()+str(num())
            else:
                if random.choice([True, False]):
                    coeff1, coeff2 = op()+str(num()), num_small()
                    coeff3, coeff4 = op()+str(num()), op()+str(int(coeff2)*random.choice([2,3]))
                else:
                    coeff3, coeff4 = op()+str(num()), num_small()
                    coeff1, coeff2 = op()+str(num()), op()+str(int(coeff4)*random.choice([2,3]))
            expr1 = sympy.sympify(coeff1+"*"+str(var1)+coeff2+"*"+str(var2))
            expr2 = sympy.sympify(coeff3+"*"+str(var1)+coeff4+"*"+str(var2))
            eq1, eq2 = sympy.Eq(expr1, random.randint(5,30)), sympy.Eq(expr2, random.randint(5,30))    
            solution = sympy.solve((eq1, eq2), (var1, var2))
            if solution and all(isinstance(val, sympy.Integer) and 1 <= val <= 15 and val != 0 for val in solution.values()):
                break
    else:
        while True:
            coeff1 = num_small()
            expr1 = sympy.sympify(coeff1+"*"+str(var1)+op()+num_small()+"*"+str(var2))
            expr2 = sympy.sympify(coeff1+"*"+str(var1)+op()+num_small()+"*"+str(var2))
            eq1, eq2 = sympy.Eq(expr1, random.randint(5,20)), sympy.Eq(expr2, random.randint(5,20))    
            solution = sympy.solve((eq1, eq2), (var1, var2))
            if solution and all(isinstance(val, sympy.Integer) and val > 0 for val in solution.values()):
                break
    return eq1, eq2, solution[var1], solution[var2]


"""
text = "Solve {}the simultaneous equations {}{}{}{}".format(random.choice(["", "algebraically "]), "\n\t", sympy.pretty(eq1), "\n\t", sympy.pretty(eq2))
answer = "{} = {}, {} = {}".format(str(var1), solution[var1] ,str(var2), solution[var2])
return text, answer
"""

latex_code = f"""
\\documentclass{{article}}
\\usepackage{{amsmath}}
\\usepackage{{lmodern}}

\\begin{{document}}
\\section*{{Simultaneous Equations - Practice Questions}}
"""

questions = []
answers = []

latex_code += """
\\textbf{{Easy Questions}}
"""
for _ in range(3):
    generated = GenerateQuestion("easy")
    answers.extend([generated[2], generated[3]])
    latex_expr = f"{sympy.latex(generated[0].lhs)} = {sympy.latex(generated[0].rhs)} "
    latex_expr1 = f"{sympy.latex(generated[1].lhs)} = {sympy.latex(generated[1].rhs)} "
    latex_code += f"\\begin{{align*}} {latex_expr} \\\\ {latex_expr1} \\end{{align*}} \n"

latex_code += """\\textbf{{Medium Questions}}"""
for _ in range(3):
    generated = GenerateQuestion("medium")
    answers.extend([generated[2], generated[3]])
    latex_expr = f"{sympy.latex(generated[0].lhs)} = {sympy.latex(generated[0].rhs)} "
    latex_expr1 = f"{sympy.latex(generated[1].lhs)} = {sympy.latex(generated[1].rhs)} "
    latex_code += f"\\begin{{align*}} {latex_expr} \\\\ {latex_expr1} \\end{{align*}} \n"

latex_code += """\\textbf{{Hard Questions}}"""
for _ in range(3):
    generated = GenerateQuestion("hard")
    answers.extend([generated[2], generated[3]])
    latex_expr = f"{sympy.latex(generated[0].lhs)} = {sympy.latex(generated[0].rhs)} "
    latex_expr1 = f"{sympy.latex(generated[1].lhs)} = {sympy.latex(generated[1].rhs)} "
    latex_code += f"\\begin{{align*}} {latex_expr} \\\\ {latex_expr1} \\end{{align*}} \n"

latex_code += """\\newpage"""
latex_code += """\\section*{{Simultaneous Equations - Solutions}}"""

latex_code += """\\textbf{{Easy Questions}}"""
for q in range(3):
    latex_expr = f"x = {sympy.latex(answers[2*q+0])}"
    latex_expr1 = f"y = {sympy.latex(answers[2*q+1])}"
    latex_code += f"\\begin{{align*}} {latex_expr} \\\\ {latex_expr1} \\end{{align*}} \n"

latex_code += """\\textbf{{Medium Questions}}"""
for q in range(3):
    latex_expr = f"x = {sympy.latex(answers[2*(3+q)+0])}"
    latex_expr1 = f"y = {sympy.latex(answers[2*(3+q)+1])}"
    latex_code += f"\\begin{{align*}} {latex_expr} \\\\ {latex_expr1} \\end{{align*}} \n"

latex_code += """\\textbf{{Hard Questions}}"""
for q in range(3):
    latex_expr = f"x = {sympy.latex(answers[2*(6+q)+0])}"
    latex_expr1 = f"y = {sympy.latex(answers[2*(6+q)+1])}"
    latex_code += f"\\begin{{align*}} {latex_expr} \\\\ {latex_expr1} \\end{{align*}} \n"

latex_code += """\\end{document}"""

with open("Simultaneous_Equations.tex", "w") as tex_file:
    tex_file.write(latex_code)


subprocess.run(["/Library/TeX/texbin/pdflatex", "Simultaneous_Equations.tex"])
os.remove('Simultaneous_Equations.tex')
os.remove('Simultaneous_Equations.aux')
os.remove('Simultaneous_Equations.log')
